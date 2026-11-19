// Delete account: removes every record the shopper owns, then the login itself, then signs her out.
// Anonymous aggregates stay (hashed coverage votes on products), since they can't be traced back to her.
import { store, supa } from './store.mjs';
import { signOut } from './auth.mjs';
import { config, HttpError } from './util.mjs';

export async function deleteAccount(request, account, data) {
  if (data?.confirm !== 'DELETE') throw new HttpError(400, 'Type DELETE to confirm');
  await store.removeOwned(account.id);
  if (config().auth === 'supabase') await supa(`/auth/v1/admin/users/${encodeURIComponent(account.id)}`, { method: 'DELETE' });
  return signOut(request);
}
