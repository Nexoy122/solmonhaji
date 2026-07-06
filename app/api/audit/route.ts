import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const WORKER_URL = (process.env.AUDIT_WORKER_URL ?? "").replace(/\/$/, "");
const WORKER_SECRET = process.env.AUDIT_WORKER_SECRET ?? "";

// Start a channel audit → proxies to the worker, returns its jobId.
export async function POST(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!WORKER_URL || !WORKER_SECRET) {
    return NextResponse.json({ error: "Channel Audit isn't configured yet." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const channel = (body?.channel ?? "").toString().trim();
  if (!channel) return NextResponse.json({ error: "Enter a channel (@handle, URL, or ID)." }, { status: 400 });

  try {
    const res = await fetch(`${WORKER_URL}/audit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-worker-secret": WORKER_SECRET },
      body: JSON.stringify({ channel }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.error || "Couldn't start the audit." }, { status: res.status });
    return NextResponse.json({ jobId: data.jobId });
  } catch {
    return NextResponse.json({ error: "Audit service is unavailable. Please try again." }, { status: 502 });
  }
}
