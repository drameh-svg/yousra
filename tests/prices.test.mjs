import test from 'node:test';
import assert from 'node:assert/strict';
import {extractProduct} from '../src/discovery.mjs';
import {amount,moneyValue,indexedPrice,matchingIndexedPrice,shopifyPrice} from '../src/prices.mjs';
const html=p=>'<script type="application/ld+json">'+JSON.stringify(p)+'</script>';
const product=(offers,extra={})=>({'@type':'Product',name:'Blue skirt',offers,...extra});
test('price formats require positive amounts and explicit currency',()=>{
 assert.equal(amount('1,299.95'),1299.95);for(const s of ['',0,-1,'19,99','NaN','free'])assert.equal(amount(s),null);
 assert.deepEqual(moneyValue('From $29.95'),{price:29.95,currency:'USD',priceFrom:true});
 assert.equal(indexedPrice({price:'29.95 USD'}).price,29.95);assert.equal(indexedPrice({price:{amount:19.5,currency:'USD'}}).price,19.5);
 assert.equal(indexedPrice({price:19.5}).price,null);
});
test('nested price specifications use sale price and reject membership and list prices',()=>{
 const p=extractProduct(html(product({priceSpecification:[{'@type':'UnitPriceSpecification',price:59,priceCurrency:'USD',priceType:'https://schema.org/StrikethroughPrice'},{'@type':'UnitPriceSpecification',price:39,priceCurrency:'USD'}]})),'https://shop.example/products/skirt');
 assert.equal(p.price,39);assert.equal(p.priceSource,'retailer-structured-data');
 const member=extractProduct(html(product({price:10,priceCurrency:'USD',validForMemberTier:'VIP'})),'https://shop.example/products/skirt');assert.equal(member.price,null);
});
test('variant and aggregate prices label a range instead of claiming a single exact price',()=>{
 const p=extractProduct(html(product([{price:29,priceCurrency:'USD'},{price:49,priceCurrency:'USD'}])),'https://shop.example/products/skirt');
 assert.equal(p.price,29);assert.equal(p.priceFrom,true);assert.deepEqual(p.priceRange,{min:29,max:49});
 const selected=extractProduct(html(product([{price:29,priceCurrency:'USD',url:'https://shop.example/products/skirt?variant=1'},{price:49,priceCurrency:'USD',url:'https://shop.example/products/skirt?variant=2'}])),'https://shop.example/products/skirt?variant=2');assert.equal(selected.price,49);assert.equal(selected.priceFrom,false);
});
test('the requested product is selected instead of recommended products in JSON-LD',()=>{
 const p=extractProduct(html({'@graph':[product({price:5,priceCurrency:'USD'},{url:'https://shop.example/products/other'}),product({price:39,priceCurrency:'USD'},{url:'https://shop.example/products/skirt'})]}),'https://shop.example/products/skirt');assert.equal(p.price,39);
});
test('retailer meta and unambiguous microdata prices are supported',()=>{
 assert.equal(extractProduct('<meta property="og:price:amount" content="39.95"><meta property="og:price:currency" content="USD">','https://shop.example/products/skirt').price,39.95);
 assert.equal(extractProduct('<meta itemprop="price" content="39.95"><meta itemprop="priceCurrency" content="USD">','https://shop.example/products/skirt').price,39.95);
 assert.equal(extractProduct('<meta itemprop="price" content="39.95"><meta itemprop="price" content="4.95"><meta itemprop="priceCurrency" content="USD">','https://shop.example/products/skirt').price,null);
});
test('Shopify prices use cents, explicit currency and the selected variant',()=>{
 const data={variants:[{id:1,price:2995,available:true},{id:2,price:4995,available:true},{id:3,price:995,available:false}]};
 assert.equal(shopifyPrice(data,'USD','2').price,49.95);assert.equal(shopifyPrice(data,'USD').price,29.95);assert.equal(shopifyPrice(data,'USD').priceFrom,true);assert.equal(shopifyPrice(data,null).price,null);assert.equal(shopifyPrice(data,'USD','missing').price,null);
});
test('index fallback must match the exact retailer product and variant URL',()=>{
 assert.equal(matchingIndexedPrice({url:'https://www.amazon.com/title/dp/B012345678?th=1'},[{link:'https://amazon.com/dp/B012345678',price:'$22.99'}]).price,22.99);
 const p={url:'https://www.shop.example/products/skirt?variant=2'};
 assert.equal(matchingIndexedPrice(p,[{link:'https://shop.example/products/other',price:'$1'}]).price,null);
 assert.equal(matchingIndexedPrice(p,[{link:'https://shop.example/products/skirt?variant=1',price:'$1'}]).price,null);
 assert.equal(matchingIndexedPrice(p,[{link:'https://shop.example/products/skirt?utm_source=google&variant=2',price:'$39.95'}]).price,39.95);
});
