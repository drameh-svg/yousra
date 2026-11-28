/**
 * Preference migration helpers for the seven SigLIP aesthetics.
 *
 * Clear mappings may be applied automatically.
 * Ambiguous mappings are listed and LEFT UNCHANGED until the user confirms.
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

/** Unambiguous renames / legacy tags → classifier id. */
export const CLEAR_PREF_MAP = {
  y2k: 'y2k',
  earthy: 'earthy',
  'clean girl': 'clean_girl',
  'clean-girl': 'clean_girl',
  clean_girl: 'clean_girl',
  cleangirl: 'clean_girl',
  '90s chic': '90s_minimalism',
  '90s-chic': '90s_minimalism',
  '90s minimalism': '90s_minimalism',
  '90s_minimalism': '90s_minimalism',
  coquette: 'coquette',
  grunge: 'grunge',
  streetwear: 'streetwear',
  // Pre-November tags with a single agreed closest class
  minimal: 'clean_girl',
  casual: 'clean_girl',
  classic: '90s_minimalism',
  elegant: '90s_minimalism',
  boho: 'earthy',
};

/**
 * Ambiguous — DO NOT auto-migrate until the product owner confirms.
 * Proposed defaults are suggestions only.
 */
export const AMBIGUOUS_PREF_MAP = {
  whimsy: { proposed: 'coquette', reason: 'Romantic / fairy-tale UI label; coquette is the closest SigLIP class, but some whimsy picks may be earthy.' },
  whimsical: { proposed: 'coquette', reason: 'Alias of whimsy.' },
  romantic: { proposed: 'coquette', reason: 'Legacy tag previously mapped to whimsy.' },
  alternative: { proposed: 'grunge', reason: 'Edgy/alt UI label; grunge is closest, but some alt looks may be streetwear.' },
  alt: { proposed: 'grunge', reason: 'Alias of alternative.' },
  sporty: { proposed: 'streetwear', reason: 'Previously mapped to y2k; streetwear may fit better now that it is a first-class label.' },
};

export function preferenceMigrationPlan(styles = []) {
  const clear = [];
  const ambiguous = [];
  const unknown = [];
  const already = [];
  for (const raw of styles) {
    const key = String(raw || '').toLowerCase().trim().replace(/\s+/g, ' ');
    const snake = key.replace(/[-\s]+/g, '_');
    if (CLASSIFIER_PREF_STYLES.includes(snake)) {
      already.push({ from: raw, to: snake });
      continue;
    }
    if (CLEAR_PREF_MAP[key] || CLEAR_PREF_MAP[snake]) {
      clear.push({ from: raw, to: CLEAR_PREF_MAP[key] || CLEAR_PREF_MAP[snake] });
      continue;
    }
    if (AMBIGUOUS_PREF_MAP[key] || AMBIGUOUS_PREF_MAP[snake]) {
      const info = AMBIGUOUS_PREF_MAP[key] || AMBIGUOUS_PREF_MAP[snake];
      ambiguous.push({ from: raw, proposed: info.proposed, reason: info.reason });
      continue;
    }
    unknown.push({ from: raw });
  }
  return { clear, ambiguous, unknown, already, awaitingConfirmation: ambiguous.length > 0 };
}

/** Apply only clear mappings. Ambiguous values are kept as-is (and flagged). */
export function migrateClearPreferences(styles = []) {
  const plan = preferenceMigrationPlan(styles);
  const out = [];
  const seen = new Set();
  for (const item of plan.already) {
    if (!seen.has(item.to)) { seen.add(item.to); out.push(item.to); }
  }
  for (const item of plan.clear) {
    if (!seen.has(item.to)) { seen.add(item.to); out.push(item.to); }
  }
  // Preserve ambiguous / unknown raw values until the user confirms (so we do not invent a mapping).
  for (const item of [...plan.ambiguous, ...plan.unknown]) {
    const keep = String(item.from).toLowerCase().trim();
    if (!seen.has(keep)) { seen.add(keep); out.push(keep); }
  }
  return { styles: out, plan };
}
