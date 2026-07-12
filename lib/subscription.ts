import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";
import { PLAN_CREDITS, type PlanId } from "@/lib/polar";

export interface UserSubscription {
  plan: PlanId | "free";
  status: string;
  polarCustomerId: string | null;
  polarSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  credits: number;
  updatedAt: number;
}

const FREE: UserSubscription = {
  plan: "free",
  status: "none",
  polarCustomerId: null,
  polarSubscriptionId: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  credits: 0,
  updatedAt: 0,
};

export async function getUserSubscription(uid: string): Promise<UserSubscription> {
  const snap = await adminDb().collection("users").doc(uid).get();
  const data = snap.data();
  if (!data?.subscription) return FREE;
  return { ...FREE, ...data.subscription };
}

export async function setUserSubscription(
  uid: string,
  patch: Partial<UserSubscription> & { plan: PlanId | "free"; status: string }
): Promise<void> {
  const credits = patch.plan === "free" ? 0 : PLAN_CREDITS[patch.plan as PlanId];
  await adminDb()
    .collection("users")
    .doc(uid)
    .set(
      {
        subscription: {
          ...FREE,
          ...patch,
          credits,
          updatedAt: Date.now(),
        },
      },
      { merge: true }
    );
}
