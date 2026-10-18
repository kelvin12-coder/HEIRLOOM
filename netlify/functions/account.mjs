import { getStore } from "@netlify/blobs";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const sha = (x) => createHash("sha256").update(String(x)).digest("hex").slice(0, 24);
const hashPw = (pw, salt) => scryptSync(pw, salt, 32).toString("hex");
export default async (req) => {
  if (req.method !== "POST") return J({ error: "post only" }, 405);
  const store = getStore("heirloom");
  let b = {}; try { b = await req.json(); } catch (e) { return J({ error: "bad request" }, 400); }
  const act = String(b.act || "");
  const user = String(b.user || "").toLowerCase();
  const pw = String(b.pw || "");
  const anon = String(b.anon || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 40);
  const ip = sha(req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "?");
  // rate limit: 20 account actions per network per hour
  const rk = "rl-" + ip + "-" + Math.floor(Date.now() / 3600000);
  const rc = Number((await store.get(rk)) || 0);
  if (rc >= 20) return J({ error: "Too many tries. Please wait an hour." }, 429);
  await store.set(rk, String(rc + 1));

  if (act === "save") { // token-authenticated cloud save
    const id = await store.get("tok-" + String(b.token || "").replace(/[^a-f0-9]/g, ""));
    if (!id) return J({ error: "Please log in again" }, 401);
    const data = String(b.data || ""); if (data.length > 60000) return J({ error: "Save too big" }, 413);
    await store.set("save-" + id, data); return J({ ok: 1 });
  }
  if (!/^[a-z0-9_]{3,16}$/.test(user)) return J({ error: "Username: 3-16 letters, numbers or _" }, 400);
  if (pw.length < 6 || pw.length > 64) return J({ error: "Password must be 6-64 characters" }, 400);
  const key = "acct-" + user;
  const mk = async (id) => { const token = randomBytes(24).toString("hex"); await store.set("tok-" + token, id); return token; };

  if (act === "register") {
    if ((await store.get(key)) !== null) return J({ error: "That username is taken" }, 409);
    const salt = randomBytes(16).toString("hex");
    const id = anon.length >= 8 ? anon : randomBytes(12).toString("hex"); // keep this device's id: no double count
    await store.setJSON(key, { salt, hash: hashPw(pw, salt), id, created: Date.now() });
    if (b.data) await store.set("save-" + id, String(b.data).slice(0, 60000));
    return J({ ok: 1, id, token: await mk(id) });
  }
  if (act === "login") {
    const a = await store.get(key, { type: "json" });
    if (!a) return J({ error: "Wrong username or password" }, 401);
    const ok = timingSafeEqual(Buffer.from(hashPw(pw, a.salt), "hex"), Buffer.from(a.hash, "hex"));
    if (!ok) return J({ error: "Wrong username or password" }, 401);
    // this browser was already counted as a "new player" before login -> merge so one person counts once
    if (anon && anon !== a.id) {
      const v = await store.get("u-" + anon);
      if (v === "1") { await store.set("u-" + anon, "merged"); const st = (await store.get("stats", { type: "json" })) || { total: 0, active: {} }; st.total = Math.max(0, st.total - 1); delete st.active[anon]; await store.setJSON("stats", st); }
    }
    return J({ ok: 1, id: a.id, token: await mk(a.id), data: (await store.get("save-" + a.id)) || "" });
  }
  return J({ error: "unknown action" }, 400);
};
export const config = { path: "/api/account" };
