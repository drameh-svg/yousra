// Shared vocabulary: seven SigLIP2 classifier aesthetics (shopper-facing), colour families, clothing types.
// Aesthetic FILTERING when a style is selected uses styleClassification from the Python worker only —
// never Gemini/text tags as the gate. Gemini may still emit legacy style tags for taste ranking features.

export const CLASSIFIER_STYLES = ['90s_minimalism','clean_girl','coquette','earthy','grunge','streetwear','y2k'];
/** Shopper-facing aesthetic ids — the seven SigLIP labels. */
export const AESTHETICS = CLASSIFIER_STYLES;

export const STYLE_LABELS = {
  '90s_minimalism': '90s Minimalism',
  clean_girl: 'Clean Girl',
  coquette: 'Coquette',
  earthy: 'Earthy',
  grunge: 'Grunge',
  streetwear: 'Streetwear',
  y2k: 'Y2K',
};

/** Clear preference / UI renames → classifier id. Ambiguous ones live in style-preferences.mjs. */
export const LEGACY_STYLES = {
  minimal: ['clean_girl'], classic: ['90s_minimalism'], casual: ['clean_girl'], elegant: ['90s_minimalism'],
  boho: ['earthy'],
  // Display / slug forms
  '90s chic': ['90s_minimalism'], '90s-chic': ['90s_minimalism'], 'clean girl': ['clean_girl'], 'clean-girl': ['clean_girl'],
};
const ALIASES = {
  '90s': '90s_minimalism', '90s-chic': '90s_minimalism', '90s chic': '90s_minimalism', nineties: '90s_minimalism',
  'clean-girl': 'clean_girl', cleangirl: 'clean_girl', 'clean girl': 'clean_girl',
};

// Listing-text cues used only for soft taste features when no classifier ranks exist — NOT for style gates.
const cue = phrases => new RegExp(`\\b(?:${phrases.join('|')})\\b`);
const CUES = {
  y2k: cue(['y2k','metallic','iridescent','holographic','rhinestones?','bedazzled','butterfly','velour','baby tee','low[- ]rise','cyber','futuristic','chrome','mesh top','cargo']),
  coquette: cue(['coquette','whimsical','whimsy','cottagecore','fairy','puff[- ]sleeves?','ruffled?','ruffles','frill(?:ed|s|y)?','lace trim','tulle','organza','smock(?:ed|ing)?','broderie','eyelet','pastel','ditsy','prairie','bow detail','tiered']),
  '90s_minimalism': cue(['90s','nineties','slip dress','satin slip','blazer','tailored','structured','minimalist','column dress','monochrome','pinstripe','trench']),
  clean_girl: cue(['clean girl','ribbed','basic','essentials?','everyday','jersey','modal','neutral','oat','stone','ecru','effortless','soft knit','lounge','relaxed fit']),
  grunge: cue(['grunge','punk','goth(?:ic)?','edgy','alt','alternative','buckles?','grommets?','distressed','patchwork','asymmetric(?:al)?','corset','leather','studded','band tee','dark academia']),
  earthy: cue(['earthy','linen','terracotta','rust','olive','moss','sand','corduroy','suede','botanical','embroidered','embroidery','folk','crochet','natural fabric','organic cotton','khaki','camel','tan']),
  streetwear: cue(['streetwear','hoodie','baggy','oversized graphic','skate','urban casual','cargo pant']),
};
const styleCache = new WeakMap();

export function normalizeStyle(value) {
  const s = String(value || '').toLowerCase().trim().replace(/\s+/g, ' ');
  if (!s) return [];
  const snake = s.replace(/[-\s]+/g, '_');
  if (CLASSIFIER_STYLES.includes(snake)) return [snake];
  if (CLASSIFIER_STYLES.includes(s)) return [s];
  if (ALIASES[s]) return [ALIASES[s]];
  if (ALIASES[snake]) return [ALIASES[snake]];
  return LEGACY_STYLES[s] || LEGACY_STYLES[snake] || [];
}
export const normalizeStyles = list => [...new Set((list || []).flatMap(normalizeStyle))];

export function classifierStyle(value) {
  const mapped = normalizeStyle(value)[0];
  return CLASSIFIER_STYLES.includes(mapped) ? mapped : null;
}
export const isClassifierStyle = value => !!classifierStyle(value);

export function inferAesthetics(text) {
  const t = String(text || '').toLowerCase();
  return CLASSIFIER_STYLES.filter(a => CUES[a]?.test(t));
}

/**
 * Soft aesthetic tags for taste ranking features.
 * Prefer SigLIP ranked labels when present; else stored styles / text cues.
 * Never used as the hard gate when a shopper selects a style filter.
 */
export function productAesthetics(p) {
  if (p && typeof p === 'object' && styleCache.has(p)) return styleCache.get(p);
  const fromClassifier = (p?.styleClassification?.status === 'ok' && Array.isArray(p.styleClassification.ranked))
    ? p.styleClassification.ranked.map(r => r.style).filter(s => CLASSIFIER_STYLES.includes(s))
    : [];
  const tagged = normalizeStyles(p?.styles);
  const out = fromClassifier.length ? [...new Set(fromClassifier)] : (tagged.length ? tagged : inferAesthetics(`${p?.title || ''} ${p?.description || ''}`));
  if (p && typeof p === 'object') styleCache.set(p, out);
  return out;
}

export const COLOR_FAMILIES = ['black','white','gray','brown','beige','cream','green','blue','navy','pink','red','purple','yellow','orange'];
const SHADES = {
  black:/\b(black|jet|onyx|ebony)\b/, white:/\b(white|ivory|off[- ]white|snow|optic white)\b/, gray:/\b(gr[ae]y|charcoal|slate|silver|heather|ash|graphite)\b/,
  brown:/\b(brown|chocolate|coffee|mocha|espresso|chestnut|cognac|tan|camel|caramel|rust|terracotta|toffee)\b/,
  beige:/\b(beige|taupe|sand|oat(meal)?|khaki|nude|stone|ecru|mushroom|latte|biscuit|champagne|camel|tan)\b/,
  cream:/\b(cream|ivory|ecru|vanilla|bone|off[- ]white)\b/,
  green:/\b(green|olive|sage|emerald|mint|khaki|moss|forest|pistachio|jade|hunter|teal)\b/,
  blue:/\b(blue|navy|denim|cobalt|azure|sky|baby blue|teal|indigo|royal|powder blue|turquoise)\b/,
  navy:/\b(navy|midnight|dark blue)\b/,
  pink:/\b(pink|blush|rose|fuchsia|magenta|dusty rose|salmon|coral|mauve)\b/,
  red:/\b(red|burgundy|maroon|wine|crimson|scarlet|oxblood|cherry|brick)\b/,
  purple:/\b(purple|lavender|lilac|violet|plum|mauve|eggplant|aubergine|grape)\b/,
  yellow:/\b(yellow|mustard|lemon|butter|gold(en)?|ochre|canary)\b/,
  orange:/\b(orange|tangerine|peach|apricot|coral|burnt orange|rust)\b/,
};
export function colorFamilies(list) {
  const out = new Set();
  for (const raw of list || []) { const c = String(raw).toLowerCase(); for (const [family, re] of Object.entries(SHADES)) if (re.test(c)) out.add(family); }
  return [...out];
}

export const CATEGORY_ALIASES = {dress:'dress',dresses:'dress',skirt:'skirt',skirts:'skirt',top:'top',tops:'top',blouse:'top',blouses:'top',
  pants:'pants',trousers:'pants',outerwear:'outerwear',coats:'outerwear',jackets:'outerwear',abaya:'abaya',abayas:'abaya'};
export const normalizeCategory = value => CATEGORY_ALIASES[String(value || '').toLowerCase().trim()] || null;
const ABAYA = /\b(abaya|abayas|jilbab|jilbaab|kaftan|caftan|jalabiya|jalabiyah|khimar dress|thobe)\b/i;
export const isAbaya = p => ABAYA.test(`${p?.title || ''} ${p?.description || ''}`) && ['dress','outerwear','unknown',undefined,null,''].includes(p?.category);

export const AESTHETIC_SEARCH = {
  y2k: 'y2k',
  coquette: 'bow lace ruffle',
  '90s_minimalism': 'minimalist tailored',
  clean_girl: 'neutral basic',
  grunge: 'black grunge',
  earthy: 'linen',
  streetwear: 'streetwear oversized',
};
