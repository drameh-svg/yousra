import type {Preferences} from './api';
import type {Prefs} from './use-prefs';

const LABEL_TO_ID: Record<string, string> = {
  '90s Minimalism': '90s_minimalism',
  'Clean Girl': 'clean_girl',
  Coquette: 'coquette',
  Earthy: 'earthy',
  Grunge: 'grunge',
  Streetwear: 'streetwear',
  Y2K: 'y2k',
  // Clear legacy display labels only — ambiguous whimsy/alternative are left for owner confirmation
  '90s Chic': '90s_minimalism',
  'clean girl': 'clean_girl',
};

export function accountPreferences(form:Prefs,base:Preferences,applyCoverage:boolean){
 const p=structuredClone(base);
 p.styles=form.aesthetics.map(s=>LABEL_TO_ID[s]||s.toLowerCase().replace(/\s+/g,'_'));
 p.sizes=form.sizes.map(s=>s.toLowerCase());p.preferredBrands=form.brands;
 const limits:Record<string,number|null>={'Under $50':50,'$50–$100':100,'$100–$200':200,'$200+':null};
 p.budgetMax=form.budget in limits?limits[form.budget]:form.budget?Number(form.budget):null;
 if(applyCoverage&&form.modesty)for(const [category,rule]of Object.entries(p.rules)){
  const coverage=form.modesty;
  rule.sleeves=coverage==='Conservative'?'long':coverage==='Moderate'?'elbow':'any';rule.neckline=coverage==='Conservative'?'high':coverage==='Moderate'?'medium':'any';rule.fit=coverage==='Conservative'?'loose':'any';
  rule.length=['dress','skirt'].includes(category)?coverage==='Conservative'?'maxi':coverage==='Moderate'?'midi':'any':'any';rule.transparency=coverage==='Relaxed'?'any':'opaque';rule.slits=coverage==='Conservative'?'none':'any';rule.cutouts=coverage==='Relaxed'?'any':'none';
 }
 return p;
}
