// Shared vocabulary for filters, ranking and search: Gemini/text aesthetics, SigLIP2 classifier styles,
// colour families and clothing types. Older style tags map at read time; listing text can add keyword evidence
// for the Gemini set only. Classifier labels come from product images via the Python worker — never from title/brand.

export const AESTHETICS = ['y2k','whimsy','90s chic','clean girl','alternative','earthy'];
/** Seven-class SigLIP2 + joblib labels (image classifier). */
export const CLASSIFIER_STYLES = ['90s_minimalism','clean_girl','coquette','earthy','grunge','streetwear','y2k'];
// Closest new aesthetic for each pre-November style name.
export const LEGACY_STYLES = {
  minimal:['clean girl'],classic:['90s chic'],casual:['clean girl'],elegant:['90s chic'],
  romantic:['whimsy'],boho:['earthy'],streetwear:['y2k'],sporty:['y2k'],
};
const ALIASES = {'90s':'90s chic','90s-chic':'90s chic','nineties':'90s chic','clean-girl':'clean girl','cleangirl':'clean girl','whimsical':'whimsy','alt':'alternative'};
/** Map UI / Gemini labels and slugs onto classifier snake_case ids when a style filter is applied. */
const TO_CLASSIFIER = {
  'y2k':'y2k', y2k:'y2k',
  'earthy':'earthy', earthy:'earthy',
  'clean girl':'clean_girl', 'clean-girl':'clean_girl', clean_girl:'clean_girl', cleangirl:'clean_girl',
  '90s chic':'90s_minimalism', '90s-chic':'90s_minimalism', '90s_minimalism':'90s_minimalism', '90s minimalism':'90s_minimalism',
  'alternative':'grunge', grunge:'grunge',
  'whimsy':'coquette', coquette:'coquette',
  streetwear:'streetwear',
};
// Listing-text cues. Kept to specific fashion terms so ordinary words don't trigger an aesthetic.
const cue = phrases => new RegExp(`\\b(?:${phrases.join('|')})\\b`);
const CUES = {
  'y2k':cue(['y2k','metallic','iridescent','holographic','rhinestones?','bedazzled','butterfly','velour','baby tee','low[- ]rise','cyber','futuristic','chrome','mesh top','cargo']),
  'whimsy':cue(['whimsical','whimsy','cottagecore','fairy','puff[- ]sleeves?','ruffled?','ruffles','frill(?:ed|s|y)?','lace trim','tulle','organza','smock(?:ed|ing)?','broderie','eyelet','pastel','ditsy','prairie','bow detail','tiered']),
  '90s chic':cue(['90s','nineties','slip dress','satin slip','blazer','tailored','structured','minimalist','column dress','monochrome','pinstripe','trench']),
  'clean girl':cue(['clean girl','ribbed','basic','essentials?','everyday','jersey','modal','neutral','oat','stone','ecru','effortless','soft knit','lounge','relaxed fit']),
  'alternative':cue(['grunge','punk','goth(?:ic)?','edgy','alt','alternative','buckles?','grommets?','distressed','patchwork','asymmetric(?:al)?','corset','leather','studded','band tee','dark academia']),
  'earthy':cue(['earthy','linen','terracotta','rust','olive','moss','sand','corduroy','suede','botanical','embroidered','embroidery','folk','crochet','natural fabric','organic cotton','khaki','camel','tan']),
};
const styleCache = new WeakMap();
export function normalizeStyle(value) {
  const s = String(value||'').toLowerCase().trim().replace(/\s+/g,' ');
  if (AESTHETICS.includes(s)) return [s];
  if (ALIASES[s]) return [ALIASES[s]];
  const snake = s.replace(/[-\s]+/g,'_');
  if (CLASSIFIER_STYLES.includes(snake)) {
    // Prefer a Gemini display label when one maps cleanly; otherwise keep classifier id for filters.
    if (snake === 'clean_girl') return ['clean girl'];
    if (snake === '90s_minimalism') return ['90s chic'];
    if (snake === 'grunge') return ['alternative'];
    if (snake === 'coquette') return ['whimsy'];
    if (snake === 'streetwear') return ['streetwear'];
    return [snake === 'y2k' || snake === 'earthy' ? snake : snake];
  }
  return LEGACY_STYLES[s] || LEGACY_STYLES[snake] || [];
}
export const normalizeStyles = list => [...new Set((list||[]).flatMap(normalizeStyle))];
export function classifierStyle(value) {
  const raw = String(value||'').toLowerCase().trim();
  if (!raw) return null;
  if (TO_CLASSIFIER[raw]) return TO_CLASSIFIER[raw];
  const spaced = raw.replace(/[_-]+/g,' ');
  if (TO_CLASSIFIER[spaced]) return TO_CLASSIFIER[spaced];
  const snake = raw.replace(/[-\s]+/g,'_');
  return CLASSIFIER_STYLES.includes(snake) ? snake : null;
}
export const isClassifierStyle = value => CLASSIFIER_STYLES.includes(classifierStyle(value)||'');
export function inferAesthetics(text) {
  const t = String(text||'').toLowerCase();
  return AESTHETICS.filter(a => CUES[a].test(t));
}
// Aesthetics for a product: model/stored tags (normalised) plus text cues when the tags are missing.
// Classifier ranks are separate (styleClassification) and used when a classifier aesthetic is selected.
export function productAesthetics(p) {
  if (p && typeof p === 'object' && styleCache.has(p)) return styleCache.get(p);
  const tagged = normalizeStyles(p?.styles);
  const out = tagged.length ? tagged : inferAesthetics(`${p?.title||''} ${p?.description||''}`);
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
  for (const raw of list||[]) { const c = String(raw).toLowerCase(); for (const [family,re] of Object.entries(SHADES)) if (re.test(c)) out.add(family); }
  return [...out];
}

// Clothing types. "abaya" is a type within dresses/outerwear, detected from the listing wording.
export const CATEGORY_ALIASES = {dress:'dress',dresses:'dress',skirt:'skirt',skirts:'skirt',top:'top',tops:'top',blouse:'top',blouses:'top',
  pants:'pants',trousers:'pants',outerwear:'outerwear',coats:'outerwear',jackets:'outerwear',abaya:'abaya',abayas:'abaya'};
export const normalizeCategory = value => CATEGORY_ALIASES[String(value||'').toLowerCase().trim()] || null;
const ABAYA = /\b(abaya|abayas|jilbab|jilbaab|kaftan|caftan|jalabiya|jalabiyah|khimar dress|thobe)\b/i;
export const isAbaya = p => ABAYA.test(`${p?.title||''} ${p?.description||''}`) && ['dress','outerwear','unknown',undefined,null,''].includes(p?.category);

// Search wording for each aesthetic: Google understands "whimsical floral" better than "whimsy".
// Words stores actually use in product titles (TikTok names like "clean girl" rarely appear in listings).
export const AESTHETIC_SEARCH = {'y2k':'y2k','whimsy':'floral ruffle','90s chic':'minimalist tailored','clean girl':'neutral basic',
  'alternative':'black grunge','earthy':'linen','streetwear':'streetwear oversized',
  // Classifier ids (when filters send snake_case)
  '90s_minimalism':'minimalist tailored','clean_girl':'neutral basic','coquette':'bow lace ruffle',
  'grunge':'black grunge'};
