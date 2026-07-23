import * as vscode from 'vscode';
import type { StatsSnapshot } from './typingTracker';

export type MerzMood = 'normal' | 'speaking' | 'applaud' | 'licking' | 'turbo' | 'disabled';

export interface MerzViewMessage {
  type: 'state' | 'say' | 'applaud' | 'lick' | 'turbo' | 'reset';
  mood?: MerzMood;
  text?: string;
  stats?: StatsSnapshot;
}

export class MerzViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = 'mehrzweckeier.merzView';

  private view: vscode.WebviewView | undefined;
  private lastStats: StatsSnapshot | undefined;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.title = 'Mehrzweckeier';
    webviewView.description = 'Leistung, nicht Lethargie';

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')]
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    if (this.lastStats) {
      this.post({
        type: 'state',
        mood: this.lastStats.enabled ? (this.lastStats.turbo ? 'turbo' : 'normal') : 'disabled',
        stats: this.lastStats
      });
    }
  }

  updateStats(stats: StatsSnapshot): void {
    this.lastStats = stats;
    this.post({
      type: 'state',
      mood: stats.enabled ? (stats.turbo ? 'turbo' : 'normal') : 'disabled',
      stats
    });
  }

  say(text: string, stats?: StatsSnapshot): void {
    this.post({ type: 'say', mood: stats?.turbo ? 'turbo' : 'speaking', text, stats });
  }

  applaud(text: string, stats: StatsSnapshot): void {
    this.post({ type: 'applaud', mood: 'applaud', text, stats });
  }

  lick(stats: StatsSnapshot): void {
    this.post({ type: 'lick', mood: 'licking', stats });
  }

  setTurbo(active: boolean, text: string | undefined, stats: StatsSnapshot): void {
    this.post({ type: 'turbo', mood: active ? 'turbo' : 'normal', text, stats });
  }

  reset(stats: StatsSnapshot): void {
    this.post({ type: 'reset', mood: stats.enabled ? 'normal' : 'disabled', stats });
  }

  async reveal(): Promise<void> {
    await vscode.commands.executeCommand(`${MerzViewProvider.viewType}.focus`);
  }

  private post(message: MerzViewMessage): void {
    void this.view?.webview.postMessage(message);
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'style.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'main.js'));
    const imageUris = {
      normal: webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'merz-normal.png')).toString(),
      speaking: webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'merz-speaking.png')).toString(),
      applaud: webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'merz-applaud.png')).toString(),
      licking: webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'merz-licking-egg.png')).toString(),
      turbo: webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'merz-turbo.png')).toString()
    };
    const aehmUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'merz-aehm.mp3')).toString();
    const plenumUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'plenum.jpg')).toString();

    return /* html */ `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; media-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <link rel="stylesheet" href="${styleUri}">
  <title>Mehrzweckeier</title>
</head>
<body>
  <img class="plenumBg" src="${plenumUri}" alt="" aria-hidden="true">
  <main class="stage" data-mood="normal">
    <section class="audioControls" aria-label="Tonsteuerung">
      <button id="muteButton" type="button" class="audioButton" title="Ton stummschalten" aria-pressed="false" aria-label="Ton stummschalten">
        <span class="audioIcon audioIcon--on" aria-hidden="true">🔊</span>
        <span class="audioIcon audioIcon--off" aria-hidden="true">🔇</span>
      </button>
      <label class="volumeLabel" for="volumeSlider" title="Lautstärke">
        <input id="volumeSlider" type="range" min="0" max="100" value="30" aria-label="Lautstärke">
      </label>
    </section>
    <section class="speech" aria-live="polite" hidden>
      <p id="speechText"></p>
    </section>
    <div class="speedlines" aria-hidden="true">
      <span></span><span></span><span></span><span></span>
    </div>
    <button class="merzButton" type="button" title="Mehrzweckeier grüßt die Leistungsgesellschaft">
      <img id="merzImage" src="${imageUris.normal}" alt="Satirischer Cartoon-Kopf von Friedrich Merz">
    </button>
    <section class="stats" aria-label="Mehrzweckeier Statistik">
      <span id="wpm">BIP-Beitrag: 0 WPM</span>
      <span id="streak">Streak: 0</span>
    </section>
  </main>
  <script nonce="${nonce}">
    window.__MEHRZWECKEIER_IMAGES__ = ${JSON.stringify(imageUris)};
    window.__MEHRZWECKEIER_AEHM__ = ${JSON.stringify(aehmUri)};
  </script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
