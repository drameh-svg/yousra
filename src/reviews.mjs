// MVP validation survey (v2): what shoppers liked, what they want next, what they prioritise, where they
// shop today and one sentence on the MVP. Stored as kind='review' records (owner = signed-in user or null).
// Older journey-survey (v1) records stay readable in the admin dashboard and CSV.
import { store } from './store.mjs';
import { hash, HttpError, id, json, now, text } from './util.mjs';

export const SURVEY = {
 version:2,
 working:[
  {id:'swipes',label:'Style swipes',emoji:'🫶'},
  {id:'coverage',label:'Coverage settings',emoji:'🧕'},
  {id:'feed',label:'For You feed',emoji:'🌿'},
  {id:'search',label:'Modest search',emoji:'🔎'},
  {id:'why',label:'"Why it matches" labels',emoji:'🏷️'},
  {id:'saves',label:'Likes & collections',emoji:'🔖'},
  {id:'prices',label:'Live price & stock checks',emoji:'💸'},
  {id:'similar',label:'Similar pieces',emoji:'🪞'},
  {id:'shop',label:'One tap to the retailer',emoji:'🛍️'},
 ],
 inProgress:[
  {id:'accuracy',label:'Sharper coverage detection',emoji:'🎯'},
  {id:'speed',label:'Faster results',emoji:'⚡'},
  {id:'more',label:'More retailers & pieces',emoji:'🧺'},
  {id:'sizing',label:'Size & shipping details',emoji:'📏'},
 ],
 ideas:[
  {id:'outfits',label:'Full outfit builder',emoji:'👗'},
  {id:'hijab',label:'Hijab colour matching',emoji:'🎨'},
  {id:'layering',label:'Layering ideas',emoji:'🧥'},
  {id:'alerts',label:'Price-drop alerts',emoji:'🔔'},
  {id:'occasions',label:'Eid & event edits',emoji:'🌙'},
  {id:'reviews',label:'Coverage reviews from other women',emoji:'💬'},
  {id:'fit',label:'Fit by height (petite / tall)',emoji:'📐'},
  {id:'backview',label:'Back & side photos',emoji:'🔄'},
  {id:'tryon',label:'Virtual try-on',emoji:'🪄'},
  {id:'extension',label:'Check any site (browser extension)',emoji:'🧩'},
  {id:'stylists',label:'Follow modest stylists',emoji:'✨'},
  {id:'ethical',label:'Ethical & sustainable filter',emoji:'🌱'},
 ],
 priorities:[
  {id:'coverage',label:'Coverage I can trust',emoji:'🧕'},
  {id:'price',label:'Price',emoji:'💸'},
  {id:'style',label:'On-trend style',emoji:'✨'},
  {id:'quality',label:'Fabric & quality',emoji:'🧵'},
  {id:'fit',label:'Fit & sizing',emoji:'📏'},
  {id:'shipping',label:'Fast, cheap shipping',emoji:'📦'},
  {id:'returns',label:'Easy returns',emoji:'↩️'},
  {id:'variety',label:'Lots of choice',emoji:'🧺'},
  {id:'ethics',label:'Ethical brands',emoji:'🌱'},
  {id:'time',label:'Saving time',emoji:'⏱️'},
 ],
 sites:[
  {id:'shein',label:'Shein'},{id:'amazon',label:'Amazon'},{id:'modanisa',label:'Modanisa'},{id:'zara',label:'Zara'},
  {id:'hm',label:'H&M'},{id:'asos',label:'ASOS'},{id:'mango',label:'Mango'},{id:'uniqlo',label:'Uniqlo'},
  {id:'aab',label:'Aab'},{id:'hautehijab',label:'Haute Hijab'},{id:'inayah',label:'Inayah'},{id:'abercrombie',label:'Abercrombie'},
  {id:'target',label:'Target'},{id:'nordstrom',label:'Nordstrom'},{id:'etsy',label:'Etsy'},{id:'instagram',label:'Instagram shops'},
  {id:'tiktok',label:'TikTok Shop'},{id:'pinterest',label:'Pinterest'},{id:'thrift',label:'Thrift / second-hand'},{id:'local',label:'Local boutiques'},
 ],
 disappointed:[
  {id:'very',label:'Very disappointed',emoji:'😢'},
  {id:'somewhat',label:'Somewhat disappointed',emoji:'😕'},
  {id:'not',label:'Not really',emoji:'🤷‍♀️'},
 ],
 starters:['Yousra made it easy to…','I loved how…','It would be perfect if…','I would use it every week because…'],
};
const ids = list => list.map(x => x.id);
const WISHES = [...ids(SURVEY.inProgress), ...ids(SURVEY.ideas)];
const pick = (value, allowed, max) => Array.isArray(value) ? [...new Set(value.filter(x => allowed.includes(x)))].slice(0, max) : [];
const extras = value => Array.isArray(value) ? [...new Set(value.map(x => text(x, 80)).filter(Boolean))].slice(0, 3) : [];
const int = (v, min, max) => { const n = Number(v); return Number.isInteger(n) && n >= min && n <= max ? n : null; };

export function validateReview(input) {
 if (!input || typeof input !== 'object' || Array.isArray(input)) throw new HttpError(400, 'Invalid feedback');
 const overall = int(input.overall, 1, 5);
 if (overall === null) throw new HttpError(400, 'Choose how you felt about Yousra overall');
 const sentence = text(input.sentence, 300);
 if (sentence.length < 3) throw new HttpError(400, 'Write one sentence about how you liked the MVP');
 return {
  version: 2, overall, sentence,
  liked: pick(input.liked, ids(SURVEY.working), 9),
  wanted: pick(input.wanted, WISHES, 16), wantedOther: extras(input.wantedOther),
  priorities: pick(input.priorities, ids(SURVEY.priorities), 3),
  sites: pick(input.sites, ids(SURVEY.sites), 20), sitesOther: extras(input.sitesOther),
  disappointed: ids(SURVEY.disappointed).includes(input.disappointed) ? input.disappointed : null,
  labeled: int(input.labeled, 0, 10) ?? 0,
  quoteOk: input.quoteOk === true,
  contact: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(input.contact, 254)) ? text(input.contact, 254).toLowerCase() : '',
  name: text(input.name, 80),
 };
}
export async function submitReview(data, { userAccount, ip, userAgent }) {
 if (!await store.reserve(`review:${hash(ip || 'unknown').slice(0, 20)}`, 12, 1000000)) throw new HttpError(429, 'Thank you! You have shared a lot of feedback today. Please try again tomorrow.');
 const review = { ...validateReview(data), id: id(), userId: userAccount?.id || null, email: userAccount?.email || null, createdAt: now(), userAgent: text(userAgent, 200), source: 'validation-survey-v2' };
 await store.put('review', review.id, review, userAccount?.id || null);
 return json({ ok: true, id: review.id }, 201);
}
const avg = list => list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length * 10) / 10 : null;
const tally = (reviews, field, catalog) => {
 const counts = {}; for (const r of reviews) for (const x of r[field] || []) counts[x] = (counts[x] || 0) + 1;
 return catalog.map(x => ({ ...x, count: counts[x.id] || 0 })).sort((a, b) => b.count - a.count);
};
export function summarize(reviews) {
 const v2 = reviews.filter(r => r.version === 2), legacy = reviews.filter(r => r.version !== 2);
 const pmf = v2.filter(r => r.disappointed);
 const priorityScores = Object.fromEntries(ids(SURVEY.priorities).map(x => [x, { points: 0, first: 0 }]));
 for (const r of v2) (r.priorities || []).forEach((p, i) => { priorityScores[p].points += 3 - i; if (i === 0) priorityScores[p].first++; });
 const inProgress = new Set(ids(SURVEY.inProgress));
 return {
  count: reviews.length, responses: v2.length, legacy: legacy.length,
  overall: avg(reviews.map(r => r.overall).filter(Boolean)),
  veryDisappointed: pmf.length ? Math.round(pmf.filter(r => r.disappointed === 'very').length / pmf.length * 100) : null, pmfResponses: pmf.length,
  liked: tally(v2, 'liked', SURVEY.working),
  wanted: tally(v2, 'wanted', [...SURVEY.inProgress, ...SURVEY.ideas]).map(x => ({ ...x, inProgress: inProgress.has(x.id) })),
  priorities: SURVEY.priorities.map(x => ({ ...x, ...priorityScores[x.id] })).sort((a, b) => b.points - a.points),
  sites: tally(v2, 'sites', SURVEY.sites),
  otherWishes: v2.flatMap(r => r.wantedOther || []), otherSites: v2.flatMap(r => r.sitesOther || []),
  labeled: v2.reduce((n, r) => n + (r.labeled || 0), 0),
 };
}
const cell = v => { const s = v === null || v === undefined ? '' : String(v); return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? "'" : '') + s.replaceAll('"', '""')}"` : s; };
const join = list => (list || []).join('; ');
export function reviewsCsv(reviews) {
 const head = ['createdAt', 'version', 'name', 'email', 'contact', 'overall', 'sentence', 'disappointed', 'liked', 'wanted', 'wantedOther', 'priority1', 'priority2', 'priority3', 'sites', 'sitesOther', 'labeled', 'quoteOk', 'legacyLoved', 'legacyImprove', 'legacyWish'];
 const rows = reviews.map(r => [r.createdAt, r.version || 1, r.name, r.email, r.contact, r.overall, r.sentence, r.disappointed, join(r.liked), join(r.wanted), join(r.wantedOther), r.priorities?.[0], r.priorities?.[1], r.priorities?.[2], join(r.sites), join(r.sitesOther), r.labeled, r.quoteOk ? 'yes' : 'no', r.loved, r.improve, r.wish]);
 return [head, ...rows].map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
export function isAdmin(u) {
 const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').map(x => x.trim()).filter(Boolean);
 const emails = (process.env.ADMIN_EMAILS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
 return !!u && (adminIds.includes(u.id) || (!!u.email && emails.includes(u.email.toLowerCase())));
}
