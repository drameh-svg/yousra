// Starter references for private testing. Source attribution is shown in onboarding.
// Review image reuse permissions and replace with owned/licensed photos before public launch.
const references = [
 ['Geometric maxi layers','https://zaskiasungkar.com/cdn/shop/files/GAYLA_2.jpg?v=1772423403&width=700','https://zaskiasungkar.com/collections/dress','dress','brown','elegant','long','high','maxi','loose'],
 ['Monochrome linen layers','https://img.staticdj.com/1715e98229a1d35ccce239327548b16f.jpg','https://www.yasmni.com/products/linen-long-sleeve-split-dress-wide-leg-pants-2pcs-set-ibpo','dress','black','minimal','long','high','maxi','loose'],
 ['Striped shirt dress','https://tshop.r10s.jp/sugawara/cabinet/05073561/05074266/10006609/32.jpg?fitin=720%3A720','https://item.rakuten.co.jp/sugawara/4-2-dw-31/','dress','beige','classic','long','high','maxi','regular'],
 ['Ocean blue stripes','https://nouralhouda.com.au/cdn/shop/files/0O5A1325.jpg?v=1765175594&width=700','https://nouralhouda.com.au/products/striped-button-up-dress-ocean-blue','dress','blue','classic','long','high','maxi','loose'],
 ['Black belted tunic','https://cdn.shopify.com/s/files/1/0025/9021/2131/files/Snapinsta.app_383375380_18387343138000387_931012552437189547_n_1080_e0bc3a34-e7d9-40d7-a7c6-147b203c38fe.jpg?v=1705137792','https://duhamuslimwear.com/blogs/news/4-outfit-hijab-versi-si-cewek-mamba','top','black','streetwear','long','high','midi','regular'],
 ['Navy pinstripe maxi','https://us.aabcollection.com/cdn/shop/files/aab_ecom_2026.03.281390.jpg?v=1777383376','https://us.aabcollection.com/products/pinstripe-maxi-shirt-navy','dress','navy','minimal','long','medium','maxi','loose'],
 ['Printed tunic and trousers','https://halalguidelines.com/wp-content/uploads/2025/08/Halal-Womens-Clothing.jpg','https://halalguidelines.com/halal-womens-clothing/','top','beige','romantic','long','high','knee','loose'],
 ['Soft statement shirt dress','https://riamiranda.com/cdn/shop/files/Katalog_Web_2__0074_NED_2925_copy.jpg?v=1752119906','https://riamiranda.com/products/orla-ceko-shirt-dress','dress','pink','romantic','long','high','maxi','loose'],
 ['Everyday cotton midi','https://xcdn.next.co.uk/Common/Items/Default/Default/ItemImages/3_4Ratio/Search/Lge/B01922.jpg?im=Resize%2Cwidth%3D450','https://www.next.co.uk/shop/gender-women-category-dresses/length-midi-material-100cotton-sleeve-shortsleeve','dress','black','casual','short','medium','midi','regular'],
 ['Navy casual midi','https://img01.ztat.net/article/spp-media-p1/76e2bd97be3340ba80856714113f81e3/b52f0ab990a44f4e92ef268da4e306e7.jpg?imwidth=762','https://www.zalando.fr/mandco-short-sleeve-midi-robe-de-jour-navy-mhj21c03d-k11.html','dress','navy','casual','short','medium','midi','regular'],
 ['Fitted tiered midi','https://elifozbey.com/cdn/shop/files/1cb3ef35b8e8226cce72bbb63891ac81.jpg?v=1761054120&width=700','https://elifozbey.com/products/siyah-basic-midi-elbise','dress','black','romantic','short','medium','midi','fitted'],
 ['Textured green midi','https://media.maxfashion.com/i/max/B23WBSBC1295GREENMEDIUM-B23WBSBC1295-MXSPR23151022_01-2100.jpg','https://www.maxfashion.com/om/en/buy-textured-midi-dress-with-round-neck-and-short-sleeves/p/B23WBSBC1295BROWNMEDIUM','dress','green','casual','short','medium','midi','regular'],
 ['Relaxed knit and trousers','https://z-shopping.c.yimg.jp/173/81002173/81002173b_b_71_500.jpg','https://store.shopping.yahoo.co.jp/zozo/80002173.html','pants','white','minimal','long','high','maxi','wide'],
 ['Wide-leg city style','https://www.nissen.co.jp/img/item/DER01/DER0123E0005/DER0123E0005_l_a033.jpg','https://www.nissen.co.jp/item/DER0123E0005','pants','beige','classic','long','high','maxi','wide'],
 ['Cozy monochrome','https://s3.cosmopolitan.co.id/articles/sweater-5-1759737445uET7r.jpg','https://www.cosmopolitan.co.id/index.php/article/read/10/2025/42997/mix-and-match-sweater-oversized-untuk-cuaca-dingin','top','black','minimal','long','high','knee','loose'],
];
export const onboarding = references.map((r,i)=>({
  id:`onboard-${i+1}`,title:r[0],image:r[1],sourceUrl:r[2],category:r[3],colors:[r[4]],styles:[r[5]],
  attributes:{sleeves:r[6],neckline:r[7],length:r[8],fit:r[9],transparency:'unknown',slits:'unknown',cutouts:'unknown'},
  confidence:0.7,analysisSource:'curated-reference',
}));
export const sampleProducts = onboarding.map(p=>({...p,id:p.id.replace('onboard','sample'),url:p.sourceUrl,images:[p.image],description:'Sample reference for testing the app. Not a verified live listing; price, stock, size and US shipping are unknown.',store:new URL(p.sourceUrl).hostname,brand:'',price:null,currency:'USD',sizes:[],shippingUS:'unknown',availability:'unknown',demo:true,discoveredAt:'2026-11-08T00:00:00Z',analyzedAt:'2026-11-08T00:00:00Z'}));
