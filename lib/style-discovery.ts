import { products, type Product } from './products';
export type StyleVote = { id: string; like: boolean };
const words = (p: Product) => new Set(`${p.title} ${p.description}`.toLowerCase().match(/[a-z]{4,}/g) || []);
export function affinity(a: Product, b: Product) {
 const x=words(a), y=words(b);
 return (a.aesthetic===b.aesthetic ? 2 : 0) + [...x].filter(w=>y.has(w)).length / Math.sqrt(Math.max(1,x.size*y.size)) * 3;
}
export function styleScore(p: Product, styles: string[], votes: StyleVote[]) {
 return (styles.includes(p.aesthetic)?3:0)+votes.reduce((score,v)=>{const ref=products.find(x=>x.id===v.id);return score+(ref?affinity(p,ref)*(v.like?1:-0.7):0)},0);
}
export function nextStylePiece(styles: string[], votes: StyleVote[]) {
 const seen=new Set(votes.map(v=>v.id));
 const pool=products.filter(p=>!seen.has(p.id)&&(!styles.length||styles.includes(p.aesthetic)));
 return pool.map(p=>({p,score:styleScore(p,styles,votes)-votes.reduce((n,v)=>{const ref=products.find(x=>x.id===v.id);return n+(ref&&ref.title.split(' ').some(w=>w.length>4&&p.title.includes(w))?0.35:0)},0)})).sort((a,b)=>b.score-a.score)[0]?.p;
}
