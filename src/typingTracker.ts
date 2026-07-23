import * as vscode from 'vscode';

export interface TrackerConfig {
  enabled: boolean;
  idleSeconds: number;
  streakThreshold: number;
  streakPauseSeconds: number;
  turboWpm: number;
}

export interface StatsSnapshot {
  enabled: boolean;
  streak: number;
  wpm: number;
  turbo: boolean;
  totalKeys: number;
}

export interface StreakMilestoneEvent extends StatsSnapshot {
  milestone: number;
}

interface KeySample {
  at: number;
  keys: number;
}

const WPM_WINDOW_MS = 15_000;
const WORD_SIZE = 5;
const TURBO_DURATION_MS = 10_000;
/** Inserts with more lines than this count as a "Großlieferung" (paste / AI dump). */
const LARGE_PASTE_LINE_THRESHOLD = 5;

export class TypingTracker implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly onStatsChangedEmitter = new vscode.EventEmitter<StatsSnapshot>();
  private readonly onIdleEmitter = new vscode.EventEmitter<StatsSnapshot>();
  private readonly onResumeEmitter = new vscode.EventEmitter<StatsSnapshot>();
  private readonly onStreakMilestoneEmitter = new vscode.EventEmitter<StreakMilestoneEvent>();
  private readonly onTurboChangedEmitter = new vscode.EventEmitter<StatsSnapshot>();
  private readonly onTypedEmitter = new vscode.EventEmitter<StatsSnapshot>();
  private readonly onLargePasteEmitter = new vscode.EventEmitter<StatsSnapshot>();

  private config: TrackerConfig;
  private idleTimer: NodeJS.Timeout | undefined;
  private turboTimer: NodeJS.Timeout | undefined;
  private lastTypeAt = 0;
  private idle = false;
  private streak = 0;
  private totalKeys = 0;
  private samples: KeySample[] = [];
  private turbo = false;
  /** After a turbo burst, wait until WPM drops below the threshold before another one. */
  private turboCooldown = false;
  private nextMilestone: number;

  readonly onStatsChanged = this.onStatsChangedEmitter.event;
  readonly onIdle = this.onIdleEmitter.event;
  readonly onResume = this.onResumeEmitter.event;
  readonly onStreakMilestone = this.onStreakMilestoneEmitter.event;
  readonly onTurboChanged = this.onTurboChangedEmitter.event;
  readonly onTyped = this.onTypedEmitter.event;
  readonly onLargePaste = this.onLargePasteEmitter.event;

  constructor(config: TrackerConfig) {
    this.config = config;
    this.nextMilestone = config.streakThreshold;

    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => this.handleTextDocumentChange(event))
    );
  }

  updateConfig(config: TrackerConfig): void {
    const wasEnabled = this.config.enabled;
    this.config = config;
    this.nextMilestone = Math.max(this.nextMilestone, config.streakThreshold);

    if (wasEnabled !== config.enabled) {
      this.emitStats();
    }

    this.scheduleIdleTimer();
  }

  reset(): void {
    this.clearTurboTimer();
    this.lastTypeAt = 0;
    this.idle = false;
    this.streak = 0;
    this.totalKeys = 0;
    this.samples = [];
    this.turbo = false;
    this.turboCooldown = false;
    this.nextMilestone = this.config.streakThreshold;
    this.scheduleIdleTimer();
    this.emitStats();
  }

  snapshot(): StatsSnapshot {
    return {
      enabled: this.config.enabled,
      streak: this.streak,
      wpm: this.calculateWpm(Date.now()),
      turbo: this.turbo,
      totalKeys: this.totalKeys
    };
  }

  dispose(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    this.clearTurboTimer();

    vscode.Disposable.from(
      ...this.disposables,
      this.onStatsChangedEmitter,
      this.onIdleEmitter,
      this.onResumeEmitter,
      this.onStreakMilestoneEmitter,
      this.onTurboChangedEmitter,
      this.onTypedEmitter,
      this.onLargePasteEmitter
    ).dispose();
  }

  private handleTextDocumentChange(event: vscode.TextDocumentChangeEvent): void {
    if (!this.config.enabled || event.document.uri.scheme !== 'file') {
      return;
    }

    const keys = this.countTypedKeys(event);
    if (keys === 0) {
      return;
    }

    const largePaste = this.isLargePaste(event);
    const now = Date.now();
    const pauseMs = this.lastTypeAt > 0 ? now - this.lastTypeAt : 0;

    if (pauseMs > this.config.streakPauseSeconds * 1000) {
      this.streak = 0;
      this.nextMilestone = this.config.streakThreshold;
    }

    if (this.idle) {
      this.idle = false;
      // Large paste gets its own line; skip the generic welcome-back quote.
      if (!largePaste) {
        this.onResumeEmitter.fire(this.snapshot());
      }
    }

    this.lastTypeAt = now;
    this.streak += keys;
    this.totalKeys += keys;
    this.samples.push({ at: now, keys });
    this.pruneSamples(now);

    const snapshot = this.snapshot();
    this.updateTurbo(snapshot);
    this.emitMilestones(snapshot);
    if (largePaste) {
      this.onLargePasteEmitter.fire(this.snapshot());
    } else {
      this.onTypedEmitter.fire(this.snapshot());
    }
    this.emitStats();
    this.scheduleIdleTimer();
  }

  private isLargePaste(event: vscode.TextDocumentChangeEvent): boolean {
    return event.contentChanges.some(
      (change) => change.text.length > 0 && change.text.split('\n').length > LARGE_PASTE_LINE_THRESHOLD
    );
  }

  private countTypedKeys(event: vscode.TextDocumentChangeEvent): number {
    return event.contentChanges.reduce((total, change) => {
      const inserted = change.text.length;
      const removed = change.rangeLength;

      if (inserted > 0) {
        return total + inserted;
      }

      // Count delete/backspace as one intentional key press without inflating WPM.
      return removed > 0 ? total + 1 : total;
    }, 0);
  }

  private scheduleIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = undefined;
    }

    if (!this.config.enabled) {
      return;
    }

    this.idleTimer = setTimeout(() => {
      this.idle = true;
      this.onIdleEmitter.fire(this.snapshot());
      this.emitStats();
      // Keep complaining every idle interval until typing resumes.
      this.scheduleIdleTimer();
    }, this.config.idleSeconds * 1000);
  }

  private calculateWpm(now: number): number {
    this.pruneSamples(now);
    const keys = this.samples.reduce((total, sample) => total + sample.keys, 0);
    const minutes = WPM_WINDOW_MS / 60_000;
    return Math.round(keys / WORD_SIZE / minutes);
  }

  private pruneSamples(now: number): void {
    const oldest = now - WPM_WINDOW_MS;
    this.samples = this.samples.filter((sample) => sample.at >= oldest);
  }

  private updateTurbo(snapshot: StatsSnapshot): void {
    const aboveThreshold = snapshot.wpm >= this.config.turboWpm;

    if (this.turbo) {
      // Keep sunglasses Merz for the full burst; the timer turns him back.
      return;
    }

    if (!aboveThreshold) {
      this.turboCooldown = false;
      return;
    }

    if (this.turboCooldown) {
      return;
    }

    this.enterTurbo(snapshot);
  }

  private enterTurbo(snapshot: StatsSnapshot): void {
    this.clearTurboTimer();
    this.turbo = true;
    this.turboCooldown = true;
    this.onTurboChangedEmitter.fire({ ...snapshot, turbo: true });

    this.turboTimer = setTimeout(() => {
      this.exitTurbo();
    }, TURBO_DURATION_MS);
  }

  private exitTurbo(): void {
    this.turboTimer = undefined;
    if (!this.turbo) {
      return;
    }

    this.turbo = false;
    const snapshot = this.snapshot();
    this.onTurboChangedEmitter.fire(snapshot);
    this.emitStats();
  }

  private clearTurboTimer(): void {
    if (this.turboTimer) {
      clearTimeout(this.turboTimer);
      this.turboTimer = undefined;
    }
  }

  private emitMilestones(snapshot: StatsSnapshot): void {
    while (this.streak >= this.nextMilestone) {
      const milestone = this.nextMilestone;
      this.nextMilestone += this.config.streakThreshold;
      this.onStreakMilestoneEmitter.fire({ ...snapshot, streak: this.streak, milestone });
    }
  }

  private emitStats(): void {
    this.onStatsChangedEmitter.fire(this.snapshot());
  }
}
