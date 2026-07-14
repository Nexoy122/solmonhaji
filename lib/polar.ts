import "server-only";
import { Polar } from "@polar-sh/sdk";

const accessToken = process.env.POLAR_ACCESS_TOKEN;
const server = (process.env.POLAR_SERVER as "sandbox" | "production") || "sandbox";

export const polar = new Polar({
  accessToken: accessToken || "",
  server,
});

export function polarConfigured(): boolean {
  return Boolean(process.env.POLAR_ACCESS_TOKEN && process.env.POLAR_WEBHOOK_SECRET);
}

export type PlanId = "starter" | "creator" | "plus";

export const PLAN_PRODUCT_IDS: Record<PlanId, string | undefined> = {
  starter: process.env.POLAR_PRODUCT_STARTER,
  creator: process.env.POLAR_PRODUCT_CREATOR,
  plus: process.env.POLAR_PRODUCT_PLUS,
};

// Monthly credits granted per plan (must match the Plans.tsx UI + pricing doc).
export const PLAN_CREDITS: Record<PlanId, number> = {
  starter: 500,
  creator: 1500,
  plus: 4000,
};

export function planIdForProduct(productId: string): PlanId | null {
  const entry = (Object.entries(PLAN_PRODUCT_IDS) as [PlanId, string | undefined][])
    .find(([, id]) => id === productId);
  return entry ? entry[0] : null;
}
