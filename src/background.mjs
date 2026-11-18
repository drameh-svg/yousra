// Work that should finish after the response is sent (stock checks, cache warm-up, logging).
// On Vercel, waitUntil keeps the function alive until it settles; elsewhere the promise simply runs on.
import { waitUntil } from '@vercel/functions';
const running = new Set();
export function background(promise) {
  const task = Promise.resolve(promise).catch(() => {}).finally(() => running.delete(task));
  running.add(task);
  try { waitUntil(task); } catch {}
  return task;
}
// Tests and scripts can wait for background work to settle.
export const settleBackground = () => Promise.allSettled([...running]);
