import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";
import { requireAdmin, logAdminAction, clientIp } from "@/lib/admin";
import { approveUser, rejectUser, setStatus, type AccessStatus } from "@/lib/access";
import { sendInviteEmail } from "@/lib/emails";

export const runtime = "nodejs";

type Action = "approve" | "reject" | "ban" | "unban" | "activate";

// POST /api/admin/users/action
// Body: { uid, action, reason? }
//
// Every action here is role-gated server-side and written to the append-only
// audit log (admin-panel spec, sections 3 + 9).
export async function POST(req: NextRequest) {
  const adminUid = await verifyRequest(req.headers.get("authorization"));

  let body: { uid?: string; action?: string; reason?: string; uids?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const action = body.action as Action;
  // Approve/reject are staff-level; ban and manual activate are admin-level.
  const min = action === "approve" || action === "reject" ? "staff" : "admin";
  const guard = await requireAdmin(adminUid, min);
  if (!guard.ok) return guard.response;

  const uids = body.uids?.length ? body.uids : body.uid ? [body.uid] : [];
  if (!uids.length) return NextResponse.json({ error: "No user specified." }, { status: 400 });

  const ip = clientIp(req.headers);
  const results: { uid: string; ok: boolean; error?: string }[] = [];

  for (const uid of uids) {
    try {
      if (action === "approve") {
        const token = await approveUser(uid, adminUid!);
        if (!token) { results.push({ uid, ok: false, error: "Not pending." }); continue; }
        // The raw token exists only here and in the email.
        await sendInviteEmail(uid, token).catch((e) => console.error("[admin] invite email failed:", e));
        await logAdminAction(adminUid!, "user.approved", "user", uid, {}, ip);
        results.push({ uid, ok: true });
      } else if (action === "reject") {
        const ok = await rejectUser(uid, adminUid!, body.reason);
        await logAdminAction(adminUid!, "user.rejected", "user", uid, { reason: body.reason ?? null }, ip);
        results.push({ uid, ok });
      } else if (action === "ban" || action === "unban" || action === "activate") {
        // Destructive/financial-adjacent actions require a reason (spec s.11).
        if (action === "ban" && !body.reason?.trim()) {
          results.push({ uid, ok: false, error: "A reason is required to ban." });
          continue;
        }
        const status: AccessStatus = action === "ban" ? "banned" : "active";
        const ok = await setStatus(uid, status, adminUid!);
        await logAdminAction(adminUid!, `user.${action}`, "user", uid, { reason: body.reason ?? null }, ip);
        results.push({ uid, ok });
      } else {
        results.push({ uid, ok: false, error: "Unknown action." });
      }
    } catch (err) {
      console.error("[admin/action] failed:", action, uid, err);
      results.push({ uid, ok: false, error: "Failed." });
    }
  }

  return NextResponse.json({ results });
}
