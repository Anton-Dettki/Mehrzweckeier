# Mehrzweckeier

Mehrzweckeier ist eine satirische VSCode/Cursor-Extension: Ein kleiner Merz-Kopf sitzt im Panel unten in der IDE, kommentiert Leerlauf, feiert Tipp-Streaks und macht aus WPM einen augenzwinkernden „BIP-Beitrag".

## Features

- Merz-Kopf als Webview im unteren Panel der IDE (Tab **Mehrzweckeier**, neben Terminal)
- Idle-Sprechblasen, wenn eine Weile nicht getippt wird
- Willkommen-zurück-Spruch beim ersten Tippen nach einer Idle-Sprechblase
- Typing-Streak-Applaus ab 100 Tasten ohne längere Pause
- WPM-Anzeige als „BIP-Beitrag" in der Statusbar
- Turbo-Merz mit Sonnenbrille bei sehr schnellem Tippen
- Kommentar beim Einfügen von mehr als 5 Zeilen (Paste / Großlieferung)
- Merz-Räuspern zu den Sprüchen — Lautstärke und Stummschaltung direkt im Panel

## Befehle

| Befehl | Beschreibung |
| --- | --- |
| `Mehrzweckeier: Merz anzeigen` | Öffnet das Merz-Panel |
| `Mehrzweckeier: Statistik zurücksetzen` | Setzt WPM, Streak und Gesamtleistung zurück |
| `Mehrzweckeier: Aktivieren/Deaktivieren` | Schaltet den Begleiter ein oder aus |

## Einstellungen

| Einstellung | Standard | Beschreibung |
| --- | --- | --- |
| `mehrzweckeier.enabled` | `true` | Aktiviert den satirischen Mehrzweckeier-Begleiter |
| `mehrzweckeier.idleSeconds` | `20` | Sekunden ohne Tippen zwischen Idle-Sprüchen |
| `mehrzweckeier.streakThreshold` | `100` | Tastenanschläge ohne längere Pause bis zum Applaus |
| `mehrzweckeier.streakPauseSeconds` | `3` | Pause in Sekunden, nach der die aktuelle Streak endet |
| `mehrzweckeier.turboWpm` | `80` | WPM-Schwellwert für Turbo-Merz |

## Hinweis

Mehrzweckeier ist Satire und steht in keiner Verbindung zu Friedrich Merz, der CDU oder dem Deutschen Bundestag. Die Extension sammelt keine Daten und sendet nichts ins Netz — gezählt wird nur lokal, wie fleißig getippt wird.

## Entwicklung

```sh
npm install
npm run compile
```

Danach per `F5` den Extension Development Host starten und im neuen Fenster unten den Tab **Mehrzweckeier** öffnen.

Paket bauen:

```sh
npm run package
```

Die erzeugte `.vsix` kann in VSCode oder Cursor installiert werden.
