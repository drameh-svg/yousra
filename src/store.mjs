import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config, HttpError, now } from './util.mjs';

let local;
async function db() {
  if (!local) {
    const { DatabaseSync } = await import('node:sqlite');
    const path = process.env.LOCAL_DB_PATH || './data/yousra.sqlite';
    mkdirSync(dirname(path), { recursive: true }); local = new DatabaseSync(path);
    local.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS records(kind TEXT, id TEXT, owner TEXT, payload TEXT NOT NULL, updated_at TEXT, PRIMARY KEY(kind,id));
      CREATE INDEX IF NOT EXISTS records_owner ON records(kind,owner);
      CREATE TABLE IF NOT EXISTS counters(provider TEXT, day TEXT, n INTEGER NOT NULL, PRIMARY KEY(provider,day));`);
  }
  return local;
}
export async function supa(path, options = {}, publicKey = false) {
  const base = process.env.SUPABASE_URL;
  const key = publicKey ? process.env.SUPABASE_PUBLISHABLE_KEY : (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!base || !key) throw new HttpError(503, 'Supabase keys are not configured');
  const response = await fetch(`${base}${path}`, { ...options, signal: AbortSignal.timeout(15_000),
    headers: { apikey: key, ...(key.startsWith('sb_') ? {} : { authorization: `Bearer ${key}` }), 'content-type': 'application/json', ...options.headers } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new HttpError(response.status >= 500 ? 503 : response.status, data?.msg || data?.error_description || data?.message || 'Database request failed');
  return data;
}
export const store = {
  async create(kind, key, payload, owner = null) {
    if (config().storage === 'supabase') {
      const rows = await supa('/rest/v1/records?on_conflict=kind,id', {method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({kind,id:key,owner,payload,updated_at:now()})});
      return !!rows?.length;
    }
    return (await db()).prepare('INSERT OR IGNORE INTO records VALUES(?,?,?,?,?)').run(kind,key,owner,JSON.stringify(payload),now()).changes > 0;
  },
  async compareAndSwap(kind, key, owner, version, payload) {
    if(config().storage==='supabase') return await supa('/rest/v1/rpc/cas_record',{method:'POST',body:JSON.stringify({p_kind:kind,p_id:key,p_owner:owner,p_version:version,p_payload:payload})});
    return (await db()).prepare("UPDATE records SET payload=?,updated_at=? WHERE kind=? AND id=? AND owner=? AND json_extract(payload,'$.version')=?").run(JSON.stringify(payload),now(),kind,key,owner,version).changes>0;
  },
  async get(kind, key, owner) {
    if (config().storage === 'supabase') {
      const rows = await supa(`/rest/v1/records?kind=eq.${encodeURIComponent(kind)}&id=eq.${encodeURIComponent(key)}${owner === undefined ? '' : `&owner=eq.${encodeURIComponent(owner)}`}&select=payload&limit=1`);
      return rows?.[0]?.payload || null;
    }
    const row = (await db()).prepare(`SELECT payload FROM records WHERE kind=? AND id=?${owner === undefined ? '' : ' AND owner=?'}`).get(...[kind,key,...(owner === undefined ? [] : [owner])]);
    return row ? JSON.parse(row.payload) : null;
  },
  async list(kind, owner, limit = 1000) {
    if (config().storage === 'supabase') return (await supa(`/rest/v1/records?kind=eq.${encodeURIComponent(kind)}${owner === undefined ? '' : `&owner=eq.${encodeURIComponent(owner)}`}&select=payload&order=updated_at.desc&limit=${limit}`)).map(x => x.payload);
    return (await db()).prepare(`SELECT payload FROM records WHERE kind=?${owner === undefined ? '' : ' AND owner=?'} ORDER BY updated_at DESC LIMIT ?`).all(...[kind,...(owner === undefined ? [] : [owner]),limit]).map(x => JSON.parse(x.payload));
  },
  async put(kind, key, payload, owner = null) {
    if (config().storage === 'supabase') await supa('/rest/v1/records?on_conflict=kind,id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({kind,id:key,owner,payload,updated_at:now()}) });
    else (await db()).prepare('INSERT INTO records VALUES(?,?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET owner=excluded.owner,payload=excluded.payload,updated_at=excluded.updated_at').run(kind,key,owner,JSON.stringify(payload),now());
    return payload;
  },
  async remove(kind, key, owner) {
    if (config().storage === 'supabase') await supa(`/rest/v1/records?kind=eq.${encodeURIComponent(kind)}&id=eq.${encodeURIComponent(key)}&owner=eq.${encodeURIComponent(owner)}`, { method: 'DELETE' });
    else (await db()).prepare('DELETE FROM records WHERE kind=? AND id=? AND owner=?').run(kind,key,owner);
  },
  async reserve(provider, dailyLimit, totalLimit) {
    if (config().storage === 'supabase') return await supa('/rest/v1/rpc/reserve_call', { method: 'POST', body: JSON.stringify({p_provider:provider,p_daily:dailyLimit,p_total:totalLimit}) });
    const sql = await db(), day = now().slice(0,10);
    sql.exec('BEGIN IMMEDIATE');
    try {
      const daily = sql.prepare('SELECT n FROM counters WHERE provider=? AND day=?').get(provider,day)?.n || 0;
      const total = sql.prepare('SELECT n FROM counters WHERE provider=? AND day=?').get(provider,'all')?.n || 0;
      if (daily >= dailyLimit || total >= totalLimit) { sql.exec('COMMIT'); return false; }
      for (const period of [day,'all']) sql.prepare('INSERT INTO counters VALUES(?,?,1) ON CONFLICT(provider,day) DO UPDATE SET n=n+1').run(provider,period);
      sql.exec('COMMIT'); return true;
    } catch (e) { sql.exec('ROLLBACK'); throw e; }
  },
  async usage() {
    if (config().storage === 'supabase') return await supa('/rest/v1/provider_usage?select=*');
    return (await db()).prepare('SELECT provider,day,n FROM counters').all();
  },
};
export async function mutate(kind, key, owner, initial, update) {
  await store.create(kind,key,{...initial,version:0},owner);
  for(let retry=0;retry<8;retry++) {
    const current=await store.get(kind,key,owner);
    const next=await update(structuredClone(current)); next.version=current.version+1;
    if(await store.compareAndSwap(kind,key,owner,current.version,next)) return next;
  }
  throw new HttpError(409,'Concurrent update. Please retry.');
}
export async function reserve(provider) {
  const prefix = provider.toUpperCase();
  if (!await store.reserve(provider, Number(process.env[`${prefix}_DAILY_LIMIT`] || (provider==='serper'?40:60)), Number(process.env[`${prefix}_TOTAL_LIMIT`] || (provider==='serper'?200:300))))
    throw new HttpError(429, `${provider} usage cap reached. Cached products are still available.`);
}
