export type QuoteCategory = 'idle' | 'streak' | 'turbo' | 'resume' | 'reset' | 'paste';

const quotes: Record<QuoteCategory, string[]> = {
  idle: [
    'Leistung, nicht Lethargie.',
    'Haben Sie schon mal von Work-Life-Balance gehört? Ich nicht.',
    'Die soziale Marktwirtschaft wartet nicht auf Ihre Inspiration.',
    '30 Sekunden Pause. Das nennt man wohl strukturelle Wachstumsbremse.',
    'Ein kurzer Hinweis aus dem Maschinenraum: Tippen wäre jetzt angebracht.',
    'Die Mitte der Tastatur bleibt heute erstaunlich ruhig.',
    'Fleiß ist keine IDE-Einstellung, sondern Haltung.',
    'Wenn Sie jetzt weiterschreiben, nenne ich das Eigenverantwortung.',
    "Wie soll ich Deutschland regieren, wenn hier seit 20 Sekunden nichts getippt wird?",
    "Ich habe keine Zeit für Kaffeepausen – und du auch nicht!",
    "Die Wirtschaft wartet nicht auf deine Inspiration.",
    "Ich habe schon Koalitionsverhandlungen geführt, die schneller vorangingen als du.",
    "Ist das hier Kurzarbeit oder was?",
    "Selbst die Ampel hat sich schneller bewegt als deine Finger gerade.",
    "Bei der Union nennt man das Attentismus – bei dir nenn ich's Faulheit.",
  ],
  streak: [
    'Leistungsträger!',
    'Das ist die Agenda 2010 der Tastatur.',
    'Endlich wieder Wachstum im Anschlagsektor.',
    'So klingt angebotsorientierte Produktivität.',
    'Die Tastatur applaudiert, ich notiere Wirtschaftswachstum.'
  ],
  turbo: [
    'Turbo-Merz aktiviert. Jetzt wird dereguliert.',
    'Diese WPM-Zahl hat Porsche-Niveau.',
    'Sonnenbrille auf: Der BIP-Beitrag eskaliert.',
    "100 Wörter pro Minute! Das nenne ich mal Made in Germany.",
    "Endlich mal Tempo, wie ich es mir für die Bürokratie wünsche.",
    "Respekt. Das war schneller als jede Kabinettssitzung.",
    "So stelle ich mir Wirtschaftswachstum vor!",
    "Wenn du so weitermachst, mach ich dich zum Staatssekretär für Effizienz.",
    "Das war deutsche Ingenieurskunst am Keyboard.",
    "So geht Leistungsgesellschaft!",
  ],
  resume: [
    'Na also. Der Standort lebt.',
    'Willkommen zurück in der Leistungsgesellschaft.',
    'Sehr gut. Die Pause war bestimmt privat finanziert.',
    'Wie schön, dass Sie sich doch noch an Ihre Verantwortung erinnern.',
    'Na also, geht doch. Sehen Sie, was passiert, wenn man sich mal aufrafft?',
    'Zurück an die Arbeit. Deutschland baut sich nicht von allein.',
    'Sehr gut. Selbstverantwortung zeigt sich eben doch, wenn man nur lange genug wartet.',
    'Endlich. Ich fing schon an, mit dem Praktikanten zu reden.'
  ],
  reset: [
    'Statistik zurückgesetzt. Neue Legislaturperiode, neues Glück.',
    'Die Zahlen sind bereinigt. Jetzt zählt nur noch Leistung.'
  ],
  paste: [
    'Das war keine deutsche Handarbeit.',
    'Großlieferung eingetroffen. Sehr marktwirtschaftlich.',
    'Outsourcing. Die unsichtbare Hand der Zwischenablage.',
    'Effizienzsteigerung durch Fremdleistung. Ich notiere das.',
    'Mehr als fünf Zeilen auf einmal. Das nennt man Skalierung.',
    'Copy-Paste ist keine Industriepolitik — aber es ist Tempo.',
    'Woher kommt dieses Wachstum? Aus der Cloud, vermute ich.',
    'Handwerk hat goldenen Boden. Sie haben offenbar einen Lieferanten.',
    'Copilot liefert, Sie nicken ab. Fast wie im Kabinett.',
    'Schön, dass wenigstens jemand hier Entscheidungen trifft – auch wenn es nicht Sie waren.',
    'Interessant. Erst beschweren Sie sich über Bürokratie, und jetzt delegieren Sie selbst.'
  ]
};

export function randomQuote(category: QuoteCategory): string {
  const bucket = quotes[category];
  return bucket[Math.floor(Math.random() * bucket.length)];
}
