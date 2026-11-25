// Pieces no shopper ever sees, whatever her coverage settings: party, sleeveless and revealing dresses, and
// menswear (Uniqlo and Zara searches return men's shirts and sweaters). Shopping pages only: the labeling queue
// and the feedback coverage game keep these, because the model has to learn what fails as well as what passes.
import { humanVerdict } from './preferences.mjs';

// Wording that always means too much skin for a dress.
const REVEALING = /\b(strapless|spaghetti|one[ -]shoulder|off[ -]the[ -]shoulder|off[ -]shoulder|backless|open[ -]back|low[ -]back|bodycon|plunge|plunging|deep[ -]v|corset|bustier|halter|slip dress|cami(?:sole)? dress|tube dress|bandage dress|mini dress|micro|cut[ -]?outs?|keyhole|high[ -]slit|thigh[ -]slit|side[ -]slit|see[ -]through|sheer|mesh|lingerie|bralette)\b/i;
// Going-out wording. These stay only when the dress is verified long or elbow sleeved AND midi or maxi
// (a covered Eid or wedding-guest dress is fine; a cocktail mini is not).
const PARTY = /\b(party|cocktail|club(?:wear|bing)?|prom|homecoming|going[ -]out|night[ -]out|bachelorette|bridesmaid|birthday dress)\b/i;
const MENS = /\b(men'?s|mens|for men|boys'?)\b|[-–|]\s*man\s*(?:$|[-–|])/i;

export const isMenswear = p => MENS.test(String(p.title || '')) && !/\bwom[ae]n'?s?\b|\bladies\b|\bgirls?\b/i.test(String(p.title || ''));

// Returns the reason a piece is hidden, or null when it may be shown.
export function hiddenReason(p) {
  if (!p || p.demo) return null;
  if (isMenswear(p)) return 'menswear';
  if (p.category !== 'dress') return null;
  const a = p.attributes || {}, title = String(p.title || '');
  const sure = f => (p.evidence?.[f]?.confidence ?? p.confidence ?? 0) >= 0.5;
  if (humanVerdict(p)?.level === 'not_modest') return 'shoppers rated it not modest';
  if (a.sleeves === 'sleeveless') return 'sleeveless dress';
  if (a.length === 'mini' && sure('length')) return 'mini dress';
  if (a.cutouts === 'present' && sure('cutouts')) return 'cut-outs';
  if (a.slits === 'present' && sure('slits')) return 'slit';
  if (p.revealing === true) return 'revealing';
  if (REVEALING.test(title)) return 'revealing';
  const covered = ['long', 'elbow'].includes(a.sleeves) && ['midi', 'maxi'].includes(a.length);
  if ((PARTY.test(title) || p.occasion === 'party') && !covered) return 'party dress';
  return null;
}
export const hiddenForEveryone = p => hiddenReason(p) !== null;
