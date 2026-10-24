import { getStore } from "@netlify/blobs";
import { validSignature, settle } from "../lib/pay.mjs";
// Paystack calls this itself when a payment succeeds (even if the player closed the game). Only requests signed with your secret key are accepted.
export default async (req) => {
  if (req.method !== "POST") return new Response("no", { status: 405 });
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-paystack-signature"))) return new Response("bad signature", { status: 401 });
  try { const e = JSON.parse(raw); if (e.event === "charge.success" && e.data && e.data.reference) await settle(getStore("heirloom"), e.data.reference); } catch (err) {}
  return new Response("ok", { status: 200 });
};
export const config = { path: "/api/paystack-webhook" };
