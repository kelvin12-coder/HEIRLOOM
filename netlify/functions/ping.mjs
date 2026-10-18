import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const sha = (x) => createHash("sha256").update(String(x)).digest("hex").slice(0, 24);
export default async (req) => {
  const store = getStore("heirloom");
  let id = "";
  if (req.method === "POST") { try { id = String((await req.json()).id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 40); } catch (e) {} }
  if (id && id.length < 8) id = "";
  const now = Date.now();
  const ip = sha(req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "?");
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
  for (const k of Object.keys(st.active)) if (now - st.active[k] > 75000) delete st.active[k];
  await store.setJSON("stats", st);
  return J({ n, total: st.total, online: Object.keys(st.active).length });
};
export const config = { path: "/api/ping" };
