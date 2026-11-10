import {ProductDetail} from '@/components/product-detail';
export default async function Product({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return <ProductDetail id={slug}/>}
