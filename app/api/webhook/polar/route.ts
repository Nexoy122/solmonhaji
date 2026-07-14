import { Webhooks } from "@polar-sh/nextjs";
import { planIdForProduct, PLAN_CREDITS } from "@/lib/polar";
import { setUserSubscription } from "@/lib/subscription";
import { setPlanAndCredits, webhookAlreadyProcessed, markWebhookProcessed } from "@/lib/credits";

interface SubscriptionEventData {
  id: string;
  status: string;
  productId: string;
  currentPeriodEnd: string | Date;
  cancelAtPeriodEnd: boolean;
  customer: { id: string; externalId?: string | null };
}

// Sync a subscription event → Firestore (status) AND the Postgres credit ledger.
// Idempotent per event id so Polar's retried deliveries never double-credit.
async function syncFromSubscription(payload: { data: SubscriptionEventData; type?: string }) {
  const sub = payload.data;
  const uid = sub.customer.externalId;
  if (!uid) {
    console.warn("Polar webhook: subscription has no externalId — skipping", sub.id);
    return;
  }

  const planId = planIdForProduct(sub.productId);
  if (!planId) {
    console.warn("Polar webhook: unrecognized product id", sub.productId);
    return;
  }

  const isActive = sub.status === "active";

  // 1) Firestore — subscription status (for UI / access checks).
  await setUserSubscription(uid, {
    plan: isActive ? planId : "free",
    status: sub.status,
    polarCustomerId: sub.customer.id,
    polarSubscriptionId: sub.id,
    currentPeriodEnd: sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toISOString() : null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
  });

  // 2) Postgres ledger — grant the monthly credit allotment on active/renewal.
  // Reference the current period end so each billing cycle credits once.
  try {
    const periodRef = `${sub.id}:${sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toISOString() : "na"}`;
    const eventKey = `${sub.id}:${sub.status}:${periodRef}`;
    if (await webhookAlreadyProcessed(eventKey)) return;

    if (isActive) {
      await setPlanAndCredits(uid, planId, PLAN_CREDITS[planId], periodRef);
    } else {
      // canceled / revoked / past_due → drop to free plan (keeps existing balance).
      await setPlanAndCredits(uid, "free", 0);
    }
    await markWebhookProcessed(eventKey);
  } catch (e) {
    console.error("[polar webhook] credit ledger update failed:", (e as Error).message);
    // Don't throw — Firestore status already updated; Polar will retry.
  }
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onSubscriptionCreated: syncFromSubscription,
  onSubscriptionUpdated: syncFromSubscription,
  onSubscriptionActive: syncFromSubscription,
  onSubscriptionCanceled: syncFromSubscription,
  onSubscriptionRevoked: syncFromSubscription,
});
