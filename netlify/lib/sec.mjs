import { createHash } from "node:crypto";
export const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
export const sha = (x) => createHash("sha256").update(String(x)).digest("hex").slice(0, 24);
export const ipOf = (req) => sha(req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "?");
// Only accept browser requests that come from our own site (blocks other websites from calling the API for a victim)
export function sameOrigin(req) {
  const o = req.headers.get("origin");
  if (!o) return true; // non-browser tools: they still hit every other check
  try { const h = new URL(o).host; const me = new URL(req.url).host; return h === me; } catch (e) { return false; }
}
// Fixed-window counter per key. Returns true if the caller is OVER the limit.
export async function over(store, key, limit, windowMs) {
  const k = "rl-" + key + "-" + Math.floor(Date.now() / windowMs);
  const c = Number((await store.get(k)) || 0);
  if (c >= limit) return true;
  await store.set(k, String(c + 1));
  return false;
}
export async function body(req, max = 70000) {
  const t = await req.text(); if (t.length > max) throw new Error("big");
  const b = JSON.parse(t); if (!b || typeof b !== "object" || Array.isArray(b)) throw new Error("bad"); return b;
}
// look up a login token -> account id (tokens expire after 30 days)
export async function who(store, token) {
  const t = String(token || "").replace(/[^a-f0-9]/g, "").slice(0, 64); if (t.length < 32) return null;
  const v = await store.get("tok-" + t, { type: "json" }).catch(() => null);
  if (!v) return null;
  if (typeof v === "string") return v; // old format
  if (v.exp && v.exp < Date.now()) { await store.delete("tok-" + t); return null; }
  return v.id;
}

// ---- anti-cheat: a save may only gain money as fast as the game can really give it (plus real purchases) ----
export const GRACE = 300000, PER_SEC = 3000, MAX_MONEY = 2e9;
export const getMeta = async (store, id) => (await store.get("meta-" + id, { type: "json" }).catch(() => null)) || { money: 0, t: 0, paid: 0, paidSeen: 0, strikes: 0, first: true };
export const isBanned = async (store, id) => (await store.get("ban-" + id)) !== null;
export async function ban(store, id, why, user) {
  await store.set("ban-" + id, String(Date.now()));
  const f = (await store.get("flags", { type: "json" }).catch(() => null)) || [];
  f.push({ id, user: user || "", why, t: Date.now() }); await store.setJSON("flags", f.slice(-200));
}
// returns null if the save looks honest, otherwise a short reason
export function checkSave(o, meta, now) {
  const m = Number(o && o.money);
  if (!Number.isFinite(m) || m < 0 || m > MAX_MONEY) return "money value impossible";
  const dt = Math.min(Math.max(0, (now - (meta.t || now)) / 1000), 86400);
  const bought = Math.max(0, (meta.paid || 0) - (meta.paidSeen || 0));
  const limit = (meta.first ? 5e6 : (meta.money || 0) + GRACE + PER_SEC * dt) + bought;
  if (m > limit) return "money jumped from " + Math.round(meta.money || 0) + " to " + Math.round(m) + " in " + Math.round(dt) + "s";
  return null;
}
