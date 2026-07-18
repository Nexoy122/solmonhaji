import { NextResponse } from "next/server";

const PAYMENT_NOTICE = "Payments are currently unavailable. Stay tuned for updates.";

export async function POST() {
  return NextResponse.json({ error: PAYMENT_NOTICE }, { status: 503 });
}
