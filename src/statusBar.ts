import * as vscode from 'vscode';
import type { StatsSnapshot } from './typingTracker';

export class MehrzweckeierStatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 96);
    this.item.name = 'Mehrzweckeier BIP-Beitrag';
    this.item.command = 'mehrzweckeier.showMerz';
  }

  update(stats: StatsSnapshot): void {
    if (!stats.enabled) {
      this.item.text = '$(circle-slash) Mehrzweckeier pausiert';
      this.item.tooltip = 'Mehrzweckeier ist deaktiviert. Klick zum Anzeigen des Panels.';
      this.item.show();
      return;
    }

    const turbo = stats.turbo ? ' $(rocket) Turbo-Merz' : '';
    this.item.text = `$(graph) BIP-Beitrag: ${stats.wpm} WPM · $(flame) ${stats.streak}${turbo}`;
    this.item.tooltip = new vscode.MarkdownString(
      [
        '**Mehrzweckeier**',
        '',
        `BIP-Beitrag: **${stats.wpm} WPM**`,
        `Typing-Streak: **${stats.streak} Tasten**`,
        `Gesamtleistung: **${stats.totalKeys} Tasten**`,
        '',
        stats.turbo
          ? 'Turbo-Merz meldet: Die Tastatur ist jetzt angebotsseitig reformiert.'
          : 'Klick, um den Merz-Begleiter im Panel zu öffnen.'
      ].join('\n')
    );
    this.item.tooltip.isTrusted = false;
    this.item.show();
  }

  dispose(): void {
    this.item.dispose();
  }
}
