import { getStore } from "@netlify/blobs";
import { timingSafeEqual } from "node:crypto";
import { J, ipOf, over, body } from "../lib/sec.mjs";
// Owner-only: list flagged cheaters / un-suspend by 8-letter id. Needs the ADMIN_KEY environment variable (a long random password you choose).
export default async (req) => {
  if (req.method !== "POST") return J({ error: "post" }, 405);
  const store = getStore("heirloom");
  if (await over(store, "adm-" + ipOf(req), 10, 3600000)) return J({ error: "no" }, 429);
  let b; try { b = await body(req, 1000); } catch (e) { return J({ error: "bad" }, 400); }
  const k = process.env.ADMIN_KEY || "", g = String(b.key || "");
  if (k.length < 16 || g.length !== k.length || !timingSafeEqual(Buffer.from(g), Buffer.from(k))) return J({ error: "no" }, 401);
  if (b.unban) { const id = String(b.unban).replace(/[^a-zA-Z0-9]/g, ""); await store.delete("ban-" + id); const m = (await store.get("meta-" + id, { type: "json" })) || {}; m.strikes = 0; await store.setJSON("meta-" + id, m); const f = ((await store.get("flags", { type: "json" })) || []).filter((x) => x.id !== id); await store.setJSON("flags", f); return J({ ok: 1 }); }
  return J({ flags: (await store.get("flags", { type: "json" })) || [] });
};
export const config = { path: "/api/admin" };
