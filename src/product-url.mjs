// Shared by the UI and backend; retailer home/category links are never purchase links.
export function isProductUrl(value){
 try{
  const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return false;
  const path=u.pathname.replace(/\/+$/,'');
  if(!path||/^\/(?:[a-z]{2}(?:-[a-z]{2})?|shop|women|womens|collections?|categor(?:y|ies)|search|home)$/i.test(path))return false;
  if(/\/(?:collections|categories|category|search|browse)(?:\/|$)/i.test(path)&&! /\/products?\//i.test(path))return false;
  if(/(^|\.)(google|pinterest|instagram|facebook|youtube|tiktok)\./i.test(u.hostname))return false;
  return /\/(?:products?|p|pd|item|ip|dp|gp\/product|goods|[\w-]+-p)\//i.test(path)||/\.(html|aspx)$/i.test(path)||/[-_]p\d+(?:[-_]|$)/i.test(path);
 }catch{return false}
}
