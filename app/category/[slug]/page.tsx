import {Browse} from '@/components/browse';
import {categories} from '@/lib/api';
import {notFound} from 'next/navigation';
export default async function Category({params}:{params:Promise<{slug:string}>}){const {slug}=await params;if(!categories.some(c=>c.id===slug))notFound();return <Browse category={slug}/>}
