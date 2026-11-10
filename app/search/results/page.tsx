import {Browse} from '@/components/browse';
export default async function SearchResults({searchParams}:{searchParams:Promise<{q?:string}>}){const {q}=await searchParams;return <Browse key={q||''} initialQuery={(q||'').slice(0,300)} mode="search"/>}
