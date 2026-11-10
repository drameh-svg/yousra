import test from 'node:test';
import assert from 'node:assert/strict';
import { supa } from '../src/store.mjs';

test('Supabase modern API keys stay in apikey; user JWTs remain in Authorization', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = {...process.env};
  const calls = [];
  try {
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
    globalThis.fetch = async (url, options) => {
      calls.push({url, headers:options.headers});
      return Response.json({ok:true});
    };
    await supa('/auth/v1/settings', {}, true);
    await supa('/rest/v1/records');
    await supa('/auth/v1/user', {headers:{authorization:'Bearer user-jwt'}}, true);
    assert.equal(calls[0].headers.apikey, 'sb_publishable_test');
    assert.equal(calls[0].headers.authorization, undefined);
    assert.equal(calls[1].headers.apikey, 'sb_secret_test');
    assert.equal(calls[1].headers.authorization, undefined);
    assert.equal(calls[2].headers.authorization, 'Bearer user-jwt');
    delete process.env.SUPABASE_SECRET_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'legacy.jwt.key';
    await supa('/rest/v1/records');
    assert.equal(calls[3].headers.authorization, 'Bearer legacy.jwt.key');
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  }
});
