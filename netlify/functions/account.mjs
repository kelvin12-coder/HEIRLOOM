import { getStore } from "@netlify/blobs";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { J, ipOf, sameOrigin, over, body, who, getMeta, isBanned, ban, checkSave } from "../lib/sec.mjs";
const hashPw = (pw, salt) => scryptSync(pw, salt, 32).toString("hex");
const RESERVED = /^(admin|administrator|owner|apex|apexvisuals|heirloom|support|staff|moderator|mod|system|paystack|official|root|help)$/;
const WEAK = new Set(["password", "123456", "1234567", "12345678", "123456789", "qwerty", "qwerty123", "password1", "11111111", "iloveyou", "abc12345", "000000", "00000000"]);
const TOKEN_DAYS = 30;
export default async (req) => {
  if (req.method !== "POST") return J({ error: "post only" }, 405);
  if (!sameOrigin(req)) return J({ error: "blocked" }, 403);
  const store = getStore("heirloom");
  try {
    let b; try { b = await body(req); } catch (e) { return J({ error: "bad request" }, 400); }
    const act = String(b.act || "");
    const user = String(b.user || "").toLowerCase();
    const pw = String(b.pw || "");
    const anon = String(b.anon || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 40);
    const ip = ipOf(req);

    if (act === "save") { // cloud save: needs a valid, un-expired login token
      if (await over(store, "sv-" + ip, 240, 3600000)) return J({ error: "Slow down" }, 429);
      const id = await who(store, b.token);
      if (!id) return J({ error: "Please log in again" }, 401);
      if (await isBanned(store, id)) return J({ error: "Account suspended for cheating.", banned: 1 }, 403);
      const data = String(b.data || "");
      if (data.length > 60000) return J({ error: "Save too big" }, 413);
      let o; try { o = JSON.parse(data); if (!o || typeof o !== "object" || Array.isArray(o)) throw 0; } catch (e) { return J({ error: "Bad save" }, 400); }
      const meta = await getMeta(store, id), now = Date.now(), why = checkSave(o, meta, now);
      if (why) { // impossible money: refuse the save, count a strike; 3 strikes = suspended and hidden from other players
        meta.strikes = (meta.strikes || 0) + 1; await store.setJSON("meta-" + id, meta);
        if (meta.strikes >= 3) { await ban(store, id, why, ""); return J({ error: "Account suspended for cheating.", banned: 1 }, 403); }
        return J({ error: "Save rejected", reset: 1 }, 409);
      }
      meta.money = Number(o.money) || 0; meta.t = now; meta.paidSeen = meta.paid || 0; meta.first = false;
      await store.setJSON("meta-" + id, meta);
      await store.set("save-" + id, data); return J({ ok: 1 });
    }
    if (act === "logout") { const t = String(b.token || "").replace(/[^a-f0-9]/g, "").slice(0, 64); if (t) await store.delete("tok-" + t); return J({ ok: 1 }); }

    // login / register attempts: 20 per network per hour
    if (await over(store, "au-" + ip, 20, 3600000)) return J({ error: "Too many tries. Please wait an hour." }, 429);
    if (!/^[a-z0-9_]{3,16}$/.test(user)) return J({ error: "Username: 3-16 letters, numbers or _" }, 400);
    if (pw.length < 6 || pw.length > 64) return J({ error: "Password must be 6-64 characters" }, 400);
    const key = "acct-" + user;
    const mk = async (id) => { const token = randomBytes(24).toString("hex"); await store.setJSON("tok-" + token, { id, exp: Date.now() + TOKEN_DAYS * 864e5 }); return token; };

    if (act === "register") {
      if (RESERVED.test(user)) return J({ error: "That username is not allowed" }, 400);
      if (pw.length < 8) return J({ error: "Password must be at least 8 characters" }, 400);
      if (WEAK.has(pw.toLowerCase()) || pw.toLowerCase() === user) return J({ error: "That password is too easy to guess. Pick another." }, 400);
      if (await over(store, "reg-" + ip, 5, 86400000)) return J({ error: "Too many new accounts from this network today." }, 429);
      if ((await store.get(key)) !== null) return J({ error: "That username is taken" }, 409);
      const salt = randomBytes(16).toString("hex");
      // keep this device's id (no double count) only if no other account already owns it
      let id = anon.length >= 8 && (await store.get("idown-" + anon)) === null ? anon : randomBytes(12).toString("hex");
      await store.set("idown-" + id, user);
      await store.setJSON(key, { salt, hash: hashPw(pw, salt), id, created: Date.now() });
      if (b.data) { try { const o = JSON.parse(String(b.data)); if (o && typeof o === "object") { const meta = await getMeta(store, id); if (checkSave(o, meta, Date.now())) { o.money = 0; } else { meta.money = Number(o.money) || 0; meta.t = Date.now(); meta.first = false; await store.setJSON("meta-" + id, meta); } await store.set("save-" + id, JSON.stringify(o).slice(0, 60000)); } } catch (e) {} }
      return J({ ok: 1, id, token: await mk(id) });
    }
    if (act === "login") {
      // lock an account for 15 minutes after 5 wrong passwords (stops password guessing from any number of networks)
      const fk = "fl-" + user, f = (await store.get(fk, { type: "json" }).catch(() => null)) || { n: 0, until: 0 };
      if (f.until > Date.now()) return J({ error: "Too many wrong passwords. Try again in 15 minutes." }, 429);
      const a = await store.get(key, { type: "json" });
      const fail = async () => { f.n = (f.until && f.until <= Date.now() ? 0 : f.n) + 1; if (f.n >= 5) { f.until = Date.now() + 900000; f.n = 0; } await store.setJSON(fk, f); return J({ error: "Wrong username or password" }, 401); };
      if (!a) { hashPw(pw, "0000000000000000"); return J({ error: "Wrong username or password" }, 401); }
      const ok = timingSafeEqual(Buffer.from(hashPw(pw, a.salt), "hex"), Buffer.from(a.hash, "hex"));
      if (!ok) return fail();
      if (f.n || f.until) await store.delete(fk);
      if (await isBanned(store, a.id)) return J({ error: "This account was suspended for cheating.", banned: 1 }, 403);
      if (anon && anon !== a.id) {
        const v = await store.get("u-" + anon);
        if (v === "1") { await store.set("u-" + anon, "merged"); const st = (await store.get("stats", { type: "json" })) || { total: 0, active: {} }; st.total = Math.max(0, st.total - 1); delete st.active[anon]; await store.setJSON("stats", st); }
      }
      return J({ ok: 1, id: a.id, token: await mk(a.id), data: (await store.get("save-" + a.id)) || "" });
    }
    return J({ error: "unknown action" }, 400);
  } catch (e) { return J({ error: "Server error. Try again." }, 500); }
};
export const config = { path: "/api/account" };
