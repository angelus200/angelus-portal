// Zentrale Badge-Farb-Map. WICHTIG: Klassen MÜSSEN statisch ausgeschrieben sein,
// sonst entfernt Tailwind sie im Production-Build (Purge).
export const ISSUER_BADGE_CLASSES: Record<string, string> = {
  yellow: 'bg-yellow-100 text-yellow-800',
  purple: 'bg-purple-100 text-purple-800',
  blue:   'bg-blue-100 text-blue-800',
  green:  'bg-green-100 text-green-800',
  orange: 'bg-orange-100 text-orange-800',
  red:    'bg-red-100 text-red-800',
  teal:   'bg-teal-100 text-teal-800',
  gray:   'bg-gray-100 text-gray-800',
};

export function issuerBadgeClass(badgeColor?: string | null): string {
  return ISSUER_BADGE_CLASSES[badgeColor ?? 'yellow'] ?? ISSUER_BADGE_CLASSES.yellow;
}
