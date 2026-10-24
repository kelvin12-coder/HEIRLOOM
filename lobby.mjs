import { getStore } from "@netlify/blobs";
import { ipOf, sameOrigin, over, isBanned } from "../lib/sec.mjs";
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const LINK = /(https?:\/\/\S+|www\.\S+|\b[a-z0-9-]+\.(com|ng|net|org|me|co|io|ly|gg|xyz|link)\b|@\w{3,})/gi;
const BAD = /(fuck|shit|bitch|nigga|pussy|dick|rape|nude|sex|whatsapp|\+?\d{9,})/gi;
export default async (req) => {
  if (req.method !== "POST") return J({ error: "post" }, 405);
  if (!sameOrigin(req)) return J({ error: "blocked" }, 403);
  let b = {}; try { b = await req.json(); } catch (e) { return J({ error: "bad" }, 400); }
  const id = String(b.id || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 40);
  if (id.length < 8) return J({ error: "id" }, 400);
  const name = String(b.name || "Player").replace(/[^\w \-]/g, "").trim().slice(0, 14) || "Player";
  const area = String(b.area || "").replace(/[^\w \-']/g, "").trim().slice(0, 24);
  const now = Date.now(), store = getStore("heirloom");
  if (await over(store, "lb-" + ipOf(req), 100, 60000)) return J({ error: "slow down" }, 429);
  const banned = await isBanned(store, id); // suspended cheaters are invisible and cannot chat
  const L = (await store.get("lobby", { type: "json" })) || { players: {}, msgs: [], seq: 0 };
  const p = L.players[id] || {}; if (!banned) L.players[id] = { n: name, a: area, t: now, last: p.last || 0 };
  let msg = String(b.msg || "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (!banned && msg && now - L.players[id].last > 2000 && !(await over(store, "chat-" + ipOf(req), 12, 60000))) { msg = msg.replace(LINK, "***").replace(BAD, "***"); L.seq += 1; L.msgs.push({ i: L.seq, n: name, m: msg, t: now }); L.players[id].last = now; if (L.msgs.length > 60) L.msgs = L.msgs.slice(-60); }
  for (const k of Object.keys(L.players)) if (now - L.players[k].t > 70000) delete L.players[k];
  await store.setJSON("lobby", L);
  const since = Number(b.since) || 0;
  return J({ players: Object.entries(L.players).slice(0, 40).map(([k, v]) => ({ me: k === id, n: v.n, a: v.a })), msgs: L.msgs.filter((m) => m.i > since).slice(-30), seq: L.seq });
};
export const config = { path: "/api/lobby" };
