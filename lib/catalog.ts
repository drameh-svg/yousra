import {money,pretty,type ApiProduct} from '@/lib/api';
import type {Product} from '@/lib/products';
export type CatalogProduct=Omit<Product,'aesthetic'> & {aesthetic:string;raw:ApiProduct};
export function toCard(p:ApiProduct):CatalogProduct{return {id:p.id,title:p.title,store:p.store,price:money(p),image:p.image||'',aesthetic:p.styles?.[0]?pretty(p.styles[0]):'Style unverified',storeUrl:`${p.shopPath}?surface=card`,pinUrl:'',raw:p}}
