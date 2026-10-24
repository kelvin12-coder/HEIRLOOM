import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";
import { J, ipOf, sameOrigin, over, body, who } from "../lib/sec.mjs";
import { PACKS, enabled, paystack, settle } from "../lib/pay.mjs";
export default async (req) => {
  if (req.method !== "POST") return J({ error: "post only" }, 405);
  if (!sameOrigin(req)) return J({ error: "blocked" }, 403);
  const store = getStore("heirloom");
  let b; try { b = await body(req, 2000); } catch (e) { return J({ error: "bad request" }, 400); }
  const act = String(b.act || "");
  if (await over(store, "pay-" + ipOf(req), 60, 3600000)) return J({ error: "Too many tries. Wait a bit." }, 429);
  if (act === "cfg") return J({ on: enabled(), packs: Object.entries(PACKS).map(([k, p]) => ({ k, n: p.n, naira: p.naira, cash: p.cash })) });
  const id = await who(store, b.token);
  if (!id) return J({ error: "Log in first so your purchase is saved to your account." }, 401);
  if (act === "init") {
    if (!enabled()) return J({ error: "Shop is not open yet." }, 503);
    const p = PACKS[String(b.pack || "")]; if (!p) return J({ error: "Unknown pack" }, 400);
    const email = String(b.email || "").trim().slice(0, 80);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return J({ error: "Enter a valid email for your receipt." }, 400);
    if (await over(store, "payinit-" + id, 10, 3600000)) return J({ error: "Too many payment attempts. Try later." }, 429);
    const ref = "hl_" + randomBytes(12).toString("hex");
    const site = process.env.URL || new URL(req.url).origin;
    const r = await paystack("/transaction/initialize", { method: "POST", body: JSON.stringify({ email, amount: p.naira * 100, currency: "NGN", reference: ref, callback_url: site + "/", metadata: { acct: id.slice(0, 8), pack: String(b.pack) } }) });
    if (!r.status || !r.data || !r.data.authorization_url) return J({ error: "Could not start payment. Try again." }, 502);
    await store.setJSON("pay-" + ref, { id, pack: String(b.pack), t: Date.now() });
    return J({ url: r.data.authorization_url });
  }
  if (act === "claim") { // after paying: server asks Paystack, then returns every un-collected credit for THIS account
    const ref = String(b.ref || "");
    if (ref) { const rec = await store.get("pay-" + ref.replace(/[^A-Za-z0-9_\-]/g, ""), { type: "json" }).catch(() => null); if (rec && rec.id === id) await settle(store, ref); }
    return J({ credits: (await store.get("credit-" + id, { type: "json" }).catch(() => null)) || [] });
  }
  if (act === "ack") {
    const done = new Set((Array.isArray(b.refs) ? b.refs : []).map(String));
    const list = ((await store.get("credit-" + id, { type: "json" }).catch(() => null)) || []).filter((c) => !done.has(c.ref));
    await store.setJSON("credit-" + id, list); return J({ ok: 1 });
  }
  return J({ error: "unknown action" }, 400);
};
export const config = { path: "/api/pay" };
