import "server-only";
import { initializeApp, getApps, getApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// ── Firebase Admin SDK (server-only) ──────────────────────────────────────────
// Credentials come from env vars so they work on Vercel (no file to deploy).
// Set these in .env (and in Vercel project settings):
//   FIREBASE_ADMIN_PROJECT_ID
//   FIREBASE_ADMIN_CLIENT_EMAIL
//   FIREBASE_ADMIN_PRIVATE_KEY   (paste the whole key; \n escapes are handled)
//
// Get them from: Firebase Console → Project Settings → Service Accounts →
// "Generate new private key". The downloaded JSON has project_id, client_email,
// and private_key — copy those three values into the env vars above.

function buildApp(): App {
  if (getApps().length) return getApp();

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  // Private keys in env files often have literal "\n" — convert to real newlines.
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin not configured. Set FIREBASE_ADMIN_PROJECT_ID, " +
        "FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY in your env."
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

/** True when the Admin SDK has the env vars it needs (lets routes 503 gracefully). */
export function adminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY
  );
}

export const adminAuth = () => getAuth(buildApp());
export const adminDb = () => getFirestore(buildApp());

/**
 * Verify a Firebase ID token from an "Authorization: Bearer <token>" header.
 * Returns the uid, or null if missing/invalid. Use to authenticate API routes.
 */
export async function verifyRequest(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const idToken = authHeader.slice(7).trim();
  if (!idToken) return null;
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    return null;
  }
}
