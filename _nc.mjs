import { readFileSync } from "fs";
const env = readFileSync(".env", "utf8");
function g(n) { const m = env.match(new RegExp("^" + n + '="((?:[^"\\\\]|\\\\.)*)"', "ms")); return m ? m[1] : ""; }
const { initializeApp, cert } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");
initializeApp({ credential: cert({ projectId: g("FIREBASE_ADMIN_PROJECT_ID"), clientEmail: g("FIREBASE_ADMIN_CLIENT_EMAIL"), privateKey: g("FIREBASE_ADMIN_PRIVATE_KEY").replace(/\\n/g, "\n") }) });
const db = getFirestore();
const seeds = {};
for (const n of ["commentary","ranking","animation","gaming","captions_only","edits_montages","memes"]) {
  const d = (await db.collection("niche_channels").doc(n).get()).data();
  for (const id of (d?.seeds ?? d?.channelIds ?? [])) seeds[id] = n;
}
const all = (await db.collection("discovery_channels").get()).docs.map(d => d.data());
const seedCh = all.filter(c => seeds[c.channelId]);
const byAi = {};
for (const c of seedCh) byAi[c.aiNiche ?? "null"] = (byAi[c.aiNiche ?? "null"]??0)+1;
console.log("Seed channels by AI niche:", byAi);
console.log("\nYour captions_only seeds and what AI tagged them:");
for (const c of seedCh) if (seeds[c.channelId] === "captions_only") console.log(`  ${c.title} → AI: ${c.aiNiche}`);
process.exit(0);
