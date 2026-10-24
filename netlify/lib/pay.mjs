import { createHmac, timingSafeEqual } from "node:crypto";
// PRICES LIVE ONLY HERE ON THE SERVER. The browser can never choose an amount.
export const PACKS = {
  A: { n: "Starter cash", naira: 500, cash: 50000 },
  B: { n: "Big cash", naira: 1000, cash: 150000 },
  C: { n: "Boss cash", naira: 2000, cash: 400000 },
  D: { n: "Tycoon cash", naira: 5000, cash: 1500000 },
};
export const SECRET = () => process.env.PAYSTACK_SECRET_KEY || "";
export const enabled = () => /^sk_(live|test)_[A-Za-z0-9]+$/.test(SECRET());
export async function paystack(path, init = {}) {
  const r = await fetch("https://api.paystack.co" + path, { ...init, headers: { authorization: "Bearer " + SECRET(), "content-type": "application/json", ...(init.headers || {}) } });
  return r.json().catch(() => ({}));
}
export function validSignature(raw, sig) {
  if (!enabled() || !sig) return false;
  const h = createHmac("sha512", SECRET()).update(raw).digest("hex");
  const a = Buffer.from(h), b = Buffer.from(String(sig));
  return a.length === b.length && timingSafeEqual(a, b);
}
// Ask Paystack (not the browser) whether this payment really happened, then credit the account ONCE.
export async function settle(store, ref) {
  ref = String(ref || "").replace(/[^A-Za-z0-9_\-]/g, "").slice(0, 60);
  const rec = await store.get("pay-" + ref, { type: "json" }).catch(() => null);
  if (!rec) return { ok: false, error: "Unknown payment" };
  if (rec.done) return { ok: true, already: true };
  const v = await paystack("/transaction/verify/" + encodeURIComponent(ref));
  const d = v && v.data;
  const pk = PACKS[rec.pack];
  if (!v.status || !d || d.status !== "success" || !pk) return { ok: false, error: "Payment not completed yet" };
  if (d.amount !== pk.naira * 100 || d.currency !== "NGN" || d.reference !== ref) return { ok: false, error: "Payment amount mismatch" };
  rec.done = true; await store.setJSON("pay-" + ref, rec); // mark first: never credit twice
  const ck = "credit-" + rec.id;
  const list = (await store.get(ck, { type: "json" }).catch(() => null)) || [];
  list.push({ ref, cash: pk.cash, n: pk.n });
  await store.setJSON(ck, list.slice(-50));
  const mk = "meta-" + rec.id, meta = (await store.get(mk, { type: "json" }).catch(() => null)) || { money: 0, t: 0, paid: 0, paidSeen: 0, strikes: 0, first: true };
  meta.paid = (meta.paid || 0) + pk.cash; await store.setJSON(mk, meta); // tells the anti-cheat this extra cash is legitimate
  return { ok: true };
}
