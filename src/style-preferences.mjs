/**
 * Keep only the seven SigLIP aesthetic ids. Old preference values are stripped — never remapped.
 */
export const CLASSIFIER_PREF_STYLES = [
  '90s_minimalism',
  'clean_girl',
  'coquette',
  'earthy',
  'grunge',
  'streetwear',
  'y2k',
];

/** Display labels and URL slugs for the seven only — not legacy six-set names. */
const ACCEPT = new Map([
  ...CLASSIFIER_PREF_STYLES.map(id => [id, id]),
  ['90s minimalism', '90s_minimalism'],
  ['90s-minimalism', '90s_minimalism'],
  ['clean girl', 'clean_girl'],
  ['clean-girl', 'clean_girl'],
  ['cleangirl', 'clean_girl'],
]);

export function toClassifierStyle(value) {
  const raw = String(value || '').toLowerCase().trim();
  if (!raw) return null;
  if (ACCEPT.has(raw)) return ACCEPT.get(raw);
  const snake = raw.replace(/[-\s]+/g, '_');
  return CLASSIFIER_PREF_STYLES.includes(snake) ? snake : null;
}

/** Drop anything that is not one of the seven SigLIP labels. */
export function sanitizeStyles(styles = []) {
  const out = [];
  const dropped = [];
  const seen = new Set();
  for (const raw of styles || []) {
    const id = toClassifierStyle(raw);
    if (!id) {
      dropped.push(String(raw));
      continue;
    }
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return { styles: out, dropped };
}
