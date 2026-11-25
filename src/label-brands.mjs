// Brands to label first, from the Nov 2026 brand research sheet ("Yusra — Top 40 Modest Shopping Brands").
// priority 1 = where most shopping happens, 2 = featured-brand targets, 3 = later. Domains marked verify:true
// were not confirmed; a wrong domain only means that brand's site search finds nothing.
export const LABEL_BRANDS = [
  {name:'Uniqlo',domain:'uniqlo.com',priority:1},
  {name:'Zara',domain:'zara.com',priority:1},
  {name:'Mango',domain:'mango.com',priority:1},
  {name:'H&M',domain:'hm.com',priority:1},
  {name:'ASOS',domain:'asos.com',priority:1},
  {name:'Modanisa',domain:'modanisa.com',priority:1},
  {name:'Shein',domain:'shein.com',priority:1},
  {name:'Abercrombie & Fitch',domain:'abercrombie.com',priority:1},
  {name:'Amazon',domain:'amazon.com',priority:1},
  {name:'& Other Stories',domain:'stories.com',priority:2},
  {name:'COS',domain:'cos.com',priority:2},
  {name:'Aritzia',domain:'aritzia.com',priority:2},
  {name:'Haute Hijab',domain:'hautehijab.com',priority:2},
  {name:'Veiled Collection',domain:'veiledcollection.com',priority:2},
  {name:'Inayah',domain:'inayah.co',priority:2},
  {name:'Aab',domain:'aabcollection.com',priority:2},
  {name:'Shukr',domain:'shukrclothing.com',priority:2},
  {name:'East Essence',domain:'eastessence.com',priority:2},
  {name:'Massimo Dutti',domain:'massimodutti.com',priority:2},
  {name:'Arket',domain:'arket.com',priority:2},
  {name:"Levi's",domain:'levi.com',priority:2},
  {name:'Next',domain:'next.co.uk',priority:2},
  {name:'Omnes',domain:'omnes.com',priority:2,verify:true},
  {name:'Ivy City Co',domain:'ivycityco.com',priority:2},
  {name:'Poplook',domain:'poplook.com',priority:2},
  {name:"Mariam's Collection",domain:'mariam-col.com',priority:3},
  {name:'Free People',domain:'freepeople.com',priority:3},
  {name:'Nike',domain:'nike.com',priority:3},
  {name:'Sabirah',domain:'sabirah.com',priority:3,verify:true},
  {name:'Primark',domain:'primark.com',priority:3},
  {name:'Ardene',domain:'ardene.com',priority:3},
  {name:'Kotn',domain:'kotn.com',priority:3},
  {name:'Piper & Scoot',domain:'piperandscoot.com',priority:3},
  {name:'Mimu Maxi',domain:'mimumaxi.com',priority:3},
  {name:'The Frock NYC',domain:'thefrocknyc.com',priority:3,verify:true},
  {name:'Louella',domain:'louella.com',priority:3,verify:true},
  {name:'Annah Hariri',domain:'annahhariri.com',priority:3},
  {name:'Niswa Fashion',domain:'niswafashion.com',priority:3,verify:true},
  {name:'Anaqa Inspired',domain:'anaqainspired.com',priority:3},
  {name:'Chinutay & Co',domain:'chinutayandco.com',priority:3,verify:true},
  {name:'Imaan Active',domain:'imaanactive.com',priority:3,verify:true},
];

// Everyday pieces across categories, so labels cover tops, bottoms and outerwear, not only dresses.
export const LABEL_QUERIES = [
  'long sleeve maxi dress','maxi skirt','long sleeve top','blouse','button down shirt','wide leg pants',
  'cardigan','knit sweater','midi dress','tunic','abaya','jumpsuit','long coat','pleated skirt',
];
// Searches with no site filter, for pieces from random stores. Several are deliberately not modest
// (sheer, slits, cutouts, mini): the model needs to see what fails, not only what passes.
export const RANDOM_QUERIES = [
  'women maxi dress','women long sleeve blouse','women maxi skirt','women wide leg trousers','women tunic top',
  'women knit dress','modest dress','modest top','hijab friendly outfit','abaya dress',
  'sheer sleeve blouse','maxi skirt with slit','cutout maxi dress','square neck dress','mini dress','cropped top',
];
// How many queries each brand gets, by priority.
export const QUERIES_PER_PRIORITY = {1:4,2:2,3:1};
