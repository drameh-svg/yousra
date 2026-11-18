// How well does coverage detection match what shoppers say? Compares the shoppers' majority level for each
// labelled product with the level implied by the model's attributes, then shows which attributes the model
// gets wrong most often. Usage: npm run eval:modesty   (read-only; no provider calls)
import { store } from '../src/store.mjs';
import { labelAgreement, summarizeVotes } from '../src/labels.mjs';
import { predictedLevel } from '../src/preferences.mjs';

const labels=(await store.list('modesty_label',undefined,20000)).filter(l=>!l.unsure);
if(!labels.length){console.log('No modesty labels yet. Share /feedback with testers (the "Rate the coverage" step).');process.exit(0);}
const atLabel=labelAgreement(labels);
console.log(`Labels: ${atLabel.labels}   products: ${atLabel.products}`);
console.log(`Agreement with the model at labelling time: ${atLabel.agreement}%`);

// Re-score against current product records, so improvements to analysis show up here.
const covered={sleeves:['long'],neckline:['high','medium'],length:['maxi','midi'],fit:['loose','wide'],transparency:['opaque'],slits:['none'],cutouts:['none']};
const byProduct=new Map();for(const l of labels){const e=byProduct.get(l.productId)||{};e[l.userId]={level:l.level,issues:l.issues||[]};byProduct.set(l.productId,e);}
let agree=0,total=0;const confusion={},misses={},flagged={};
for(const [productId,votes] of byProduct){
  const product=await store.get('product',productId);if(!product)continue;
  const human=summarizeVotes(votes),model=predictedLevel(product);total++;if(human.level===model)agree++;
  confusion[human.level]??={};confusion[human.level][model]=(confusion[human.level][model]||0)+1;
  for(const [field,n] of Object.entries(human.issues)){if(n*2<human.count)continue;flagged[field]=(flagged[field]||0)+1;if(covered[field]?.includes(product.attributes?.[field]))misses[field]=(misses[field]||0)+1;}
}
console.log(`Agreement with current analysis: ${total?Math.round(agree/total*100):0}% of ${total} products\n`);
const levels=['conservative','moderate','relaxed','not_modest'];
console.log('Shoppers said ↓  /  model said →'.padEnd(34)+levels.map(l=>l.padStart(13)).join(''));
for(const h of levels)console.log(h.padEnd(34)+levels.map(m=>String(confusion[h]?.[m]||0).padStart(13)).join(''));
console.log('\nAttributes shoppers flagged as a problem, and how often the model said it was fine:');
for(const [field,n] of Object.entries(flagged).sort((a,b)=>b[1]-a[1]))console.log(`  ${field.padEnd(13)} flagged on ${n} products · model missed it on ${misses[field]||0}`);
console.log('\nExport training/eval data from /admin/reviews → "Download modesty labels" (JSONL or CSV).');
