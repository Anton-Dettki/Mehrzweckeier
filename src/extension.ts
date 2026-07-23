import * as vscode from 'vscode';
import { MerzViewProvider } from './merzViewProvider';
import { randomQuote } from './quotes';
import { MehrzweckeierStatusBar } from './statusBar';
import { TrackerConfig, TypingTracker } from './typingTracker';

const EGG_LICK_CHANCE = 0.05;

export function activate(context: vscode.ExtensionContext): void {
  try {
    activateExtension(context);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`Mehrzweckeier konnte nicht starten: ${message}`);
    console.error('[Mehrzweckeier] activate failed', error);
  }
}

function activateExtension(context: vscode.ExtensionContext): void {
  const provider = new MerzViewProvider(context.extensionUri);

  // Register the webview provider first so the panel never opens without it.
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(MerzViewProvider.viewType, provider, {
      webviewOptions: {
        retainContextWhenHidden: true
      }
    })
  );

  const statusBar = new MehrzweckeierStatusBar();
  const tracker = new TypingTracker(readConfig());
  let resumeAfterIdleQuote = false;

  context.subscriptions.push(
    tracker,
    statusBar,
    vscode.commands.registerCommand('mehrzweckeier.showMerz', async () => {
      try {
        await provider.reveal();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Mehrzweckeier Panel konnte nicht geöffnet werden: ${message}`);
      }
    }),
    vscode.commands.registerCommand('mehrzweckeier.resetStats', () => {
      resumeAfterIdleQuote = false;
      tracker.reset();
      provider.say(randomQuote('reset'), tracker.snapshot());
    }),
    vscode.commands.registerCommand('mehrzweckeier.toggle', async () => {
      const config = vscode.workspace.getConfiguration('mehrzweckeier');
      const enabled = config.get<boolean>('enabled', true);
      await config.update('enabled', !enabled, vscode.ConfigurationTarget.Global);
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('mehrzweckeier')) {
        tracker.updateConfig(readConfig());
      }
    })
  );

  tracker.onStatsChanged((stats) => {
    statusBar.update(stats);
    provider.updateStats(stats);
  });

  tracker.onTyped((stats) => {
    if (!stats.turbo && Math.random() < EGG_LICK_CHANCE) {
      provider.lick(stats);
    }
  });

  tracker.onIdle((stats) => {
    resumeAfterIdleQuote = true;
    provider.say(randomQuote('idle'), stats);
  });

  tracker.onResume((stats) => {
    if (!resumeAfterIdleQuote) {
      return;
    }

    resumeAfterIdleQuote = false;
    provider.say(randomQuote('resume'), stats);
  });

  tracker.onLargePaste((stats) => {
    // Paste after idle replaces the resume greeting.
    resumeAfterIdleQuote = false;
    provider.say(randomQuote('paste'), stats);
  });

  tracker.onStreakMilestone((event) => {
    provider.applaud(randomQuote('streak'), event);
  });

  tracker.onTurboChanged((stats) => {
    provider.setTurbo(stats.turbo, stats.turbo ? randomQuote('turbo') : undefined, stats);
  });

  const initialStats = tracker.snapshot();
  statusBar.update(initialStats);
  provider.updateStats(initialStats);
}

export function deactivate(): void {
  // Disposables are owned by the extension context.
}

function readConfig(): TrackerConfig {
  const config = vscode.workspace.getConfiguration('mehrzweckeier');

  return {
    enabled: config.get<boolean>('enabled', true),
    idleSeconds: config.get<number>('idleSeconds', 20),
    streakThreshold: config.get<number>('streakThreshold', 100),
    streakPauseSeconds: config.get<number>('streakPauseSeconds', 3),
    turboWpm: config.get<number>('turboWpm', 80)
  };
}
