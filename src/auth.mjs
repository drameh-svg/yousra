import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { store, supa } from './store.mjs';
import { appendCookies, config, cookie, cookies, hash, HttpError, id, json, now, text } from './util.mjs';

export function assertEnvironment() {
  const c = config();
  if (process.env.NODE_ENV === 'production' && (c.auth !== 'supabase' || c.storage !== 'supabase') && process.env.ALLOW_LOCAL_PRODUCTION !== 'true')
    throw new Error('Production requires AUTH_MODE=supabase and STORAGE=supabase. Local mode is for testing.');
  if (c.auth === 'supabase' && c.storage !== 'supabase') throw new Error('Supabase authentication requires Supabase storage.');
}
export async function user(request) {
  const jar = cookies(request);
  if (config().auth === 'supabase') {
    const token = request.headers.get('authorization')?.replace(/^Bearer /i,'') || jar.ys_access;
    if (!token) throw new HttpError(401, 'Please sign in');
    const u = await supa('/auth/v1/user', { headers: { authorization:`Bearer ${token}` } }, true).catch(() => null);
    if (!u?.id) throw new HttpError(401, 'Session expired. Sign in again or refresh your session.');
    return { id:u.id,email:u.email };
  }
  const session = jar.ys_session && await store.get('session', hash(jar.ys_session));
  if (!session || session.expires < Date.now()) throw new HttpError(401, 'Please sign in');
  return {id:session.userId,email:session.email};
}
function passwordHash(password, salt) { return scryptSync(password,salt,64).toString('hex'); }
function validate(data) {
  const email = text(data.email,254).toLowerCase(), password = data.password;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400,'Enter a valid email');
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new HttpError(400,'Use a password with 8–128 characters');
  return {email,password};
}
function supaSession(data, payload = {}) {
  return appendCookies(json({user:{id:data.user.id,email:data.user.email},...payload}), [cookie('ys_access',data.access_token,data.expires_in || 3600),cookie('ys_refresh',data.refresh_token,86400*30)]);
}
async function saveNewsletter(account, data) {
  await store.put('newsletter',account.id,{
    email:account.email,optedIn:data.newsletterOptIn===true,
    recordedAt:now(),source:'signup',consentText:'Email me occasional Yousra news and updates (optional).'
  },account.id);
}
export async function signIn(data, signup) {
  const {email,password} = validate(data);
  if (config().auth === 'supabase') {
    const result = await supa(signup?'/auth/v1/signup':'/auth/v1/token?grant_type=password', {method:'POST',body:JSON.stringify({email,password})},true);
    if (!result.access_token) return json({confirmationRequired:true,message:'Check your email to confirm your account, then sign in.'});
    if(signup&&result.user?.id)await saveNewsletter(result.user,data);
    return supaSession(result);
  }
  const key = hash(email); let account = await store.get('account',key);
  if (signup) {
    if (account) throw new HttpError(409,'An account already exists');
    const salt = randomBytes(16).toString('hex');
    account = {id:id(),email,salt,password:passwordHash(password,salt),createdAt:now()};
    if(!await store.create('account',key,account,account.id)) throw new HttpError(409,'An account already exists');
  } else {
    if (!account || !timingSafeEqual(Buffer.from(passwordHash(password,account.salt),'hex'),Buffer.from(account.password,'hex'))) throw new HttpError(401,'Incorrect email or password');
  }
  if(signup)await saveNewsletter(account,data);
  const token = randomBytes(32).toString('hex');
  await store.put('session',hash(token),{userId:account.id,email,expires:Date.now()+86400000*7},account.id);
  return appendCookies(json({user:{id:account.id,email},localTest:true}),[cookie('ys_session',token,86400*7)]);
}
export async function signOut(request) {
  const jar = cookies(request);
  if (jar.ys_session) { const s = await store.get('session',hash(jar.ys_session)); if (s) await store.remove('session',hash(jar.ys_session),s.userId); }
  if (config().auth === 'supabase' && jar.ys_access) await supa('/auth/v1/logout',{method:'POST',headers:{authorization:`Bearer ${jar.ys_access}`}},true).catch(()=>{});
  return appendCookies(json({ok:true}),['ys_session','ys_access','ys_refresh','ys_pkce','ys_state'].map(n=>cookie(n,'',0)));
}
export async function refresh(request) {
  const refresh_token = cookies(request).ys_refresh;
  if (config().auth !== 'supabase' || !refresh_token) throw new HttpError(401,'Please sign in');
  return supaSession(await supa('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token})},true));
}
