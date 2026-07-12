import { Webhooks } from "@polar-sh/nextjs";
import { planIdForProduct } from "@/lib/polar";
import { setUserSubscription } from "@/lib/subscription";

interface SubscriptionEventData {
  id: string;
  status: string;
  productId: string;
  currentPeriodEnd: string | Date;
  cancelAtPeriodEnd: boolean;
  customer: { id: string; externalId?: string | null };
}

async function syncFromSubscription(payload: { data: SubscriptionEventData }) {
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

  await setUserSubscription(uid, {
    plan: isActive ? planId : "free",
    status: sub.status,
    polarCustomerId: sub.customer.id,
    polarSubscriptionId: sub.id,
    currentPeriodEnd: sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toISOString() : null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
  });
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onSubscriptionCreated: syncFromSubscription,
  onSubscriptionUpdated: syncFromSubscription,
  onSubscriptionActive: syncFromSubscription,
  onSubscriptionCanceled: syncFromSubscription,
  onSubscriptionRevoked: syncFromSubscription,
});
