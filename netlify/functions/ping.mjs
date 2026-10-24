import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";
import { sameOrigin, over } from "../lib/sec.mjs";
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const sha = (x) => createHash("sha256").update(String(x)).digest("hex").slice(0, 24);
export default async (req) => {
  if (req.method === "POST" && !sameOrigin(req)) return J({ error: "blocked" }, 403);
  const store = getStore("heirloom");
  let id = "", fb = null;
  if (req.method === "POST") { try { const b = await req.json(); id = String(b.id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 40); if (b.fb === 0 || b.fb === 1) fb = b.fb; } catch (e) {} }
  if (id && id.length < 8) id = "";
  const now = Date.now();
  const ip = sha(req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "?");
  if (await over(store, "pg-" + ip, 150, 60000)) return J({ error: "slow down" }, 429);
  let st = (await store.get("stats", { type: "json" })) || { total: 0, active: {} };
  let n = 0;
  if (id) {
    const seen = await store.get("u-" + id);
    if (seen === null) {
      // anti-bot: at most 5 brand-new players per network per day
      const day = Math.floor(now / 86400000), k = "ipn-" + ip + "-" + day;
      const c = Number((await store.get(k)) || 0);
      if (c < 5) {
        await store.set(k, String(c + 1));
        st.total += 1; n = st.total; await store.set("u-" + id, "1");
        const topic = process.env.NTFY_TOPIC;
        if (topic) { try { await fetch("https://ntfy.sh/" + encodeURIComponent(topic), { method: "POST", body: "🎮 Heirloom: new player #" + n + " joined (" + Object.keys(st.active).length + " online)", headers: { Title: "New player!" } }); } catch (e) {} }
      } else { await store.set("u-" + id, "0"); }
    }
    st.active[id] = now;
  }
  if (fb !== null && id) { const fk = "fb-" + id; if ((await store.get(fk)) === null) { await store.set(fk, String(fb)); st.yes = (st.yes || 0) + (fb === 1 ? 1 : 0); st.no = (st.no || 0) + (fb === 0 ? 1 : 0); } }
  for (const k of Object.keys(st.active)) if (now - st.active[k] > 75000) delete st.active[k];
  await store.setJSON("stats", st);
  return J({ n, total: st.total, online: Object.keys(st.active).length, yes: st.yes || 0, no: st.no || 0 });
};
export const config = { path: "/api/ping" };
