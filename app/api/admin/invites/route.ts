import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";
import { requireAdmin, logAdminAction, clientIp } from "@/lib/admin";
import {
  createInvite, listInvites, listTeam, revokeInvite, removeTeamMember,
  ROLE_INFO, ASSIGNABLE_ROLES, type PlatformRole,
} from "@/lib/roles";
import { sendRoleInviteEmail, sendEarlyAccessInviteEmail } from "@/lib/emails";

export const runtime = "nodejs";

// GET /api/admin/invites -> pending/accepted invites + current team.
export async function GET(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  const guard = await requireAdmin(uid, "staff");
  if (!guard.ok) return guard.response;

  try {
    const [invites, team] = await Promise.all([listInvites(), listTeam()]);
    return NextResponse.json({ invites, team, role: guard.role });
  } catch (err) {
    console.error("[admin/invites] list failed:", err);
    return NextResponse.json({ error: "Couldn't load invites." }, { status: 500 });
  }
}

// POST /api/admin/invites -> invite someone by email.
// Body: { email, role, kind?: "team" | "early_access", note? }
export async function POST(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));

  let body: { email?: string; role?: string; kind?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const kind = body.kind === "early_access" ? "early_access" : "team";

  // Granting TEAM roles is super_admin only: that's privilege escalation, so an
  // admin can't quietly promote themselves or a friend. Early-access invites
  // are a normal staff action.
  const guard = await requireAdmin(uid, kind === "team" ? "super_admin" : "staff");
  if (!guard.ok) return guard.response;

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "An email is required." }, { status: 400 });

  const role = (kind === "early_access" ? "user" : body.role) as PlatformRole;
  if (kind === "team" && !ASSIGNABLE_ROLES.includes(role)) {
    return NextResponse.json({ error: "Pick a valid role." }, { status: 400 });
  }

  const note = body.note?.trim().slice(0, 300) || null;

  const res = await createInvite({ email, role, kind, invitedBy: uid!, note });
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: 400 });

  try {
    if (kind === "early_access") {
      await sendEarlyAccessInviteEmail({ email, token: res.token, note });
    } else {
      const info = ROLE_INFO[role as Exclude<PlatformRole, "user">];
      await sendRoleInviteEmail({
        email, role, roleLabel: info.label, roleBlurb: info.blurb, token: res.token, note,
      });
    }
  } catch (err) {
    // The invite exists but the email didn't send: say so rather than pretend.
    console.error("[admin/invites] email failed:", err);
    return NextResponse.json(
      { error: "Invite created, but the email failed to send. Check the Resend key." },
      { status: 502 }
    );
  }

  await logAdminAction(uid!, `invite.sent.${kind}`, "email", email, { role, note }, clientIp(req.headers));
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/invites -> revoke a pending invite, or remove a team member.
// Body: { id? , uid? }
export async function DELETE(req: NextRequest) {
  const adminUid = await verifyRequest(req.headers.get("authorization"));
  const guard = await requireAdmin(adminUid, "super_admin");
  if (!guard.ok) return guard.response;

  let body: { id?: string; uid?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const ip = clientIp(req.headers);
  try {
    if (body.id) {
      const ok = await revokeInvite(body.id);
      await logAdminAction(adminUid!, "invite.revoked", "invite", body.id, {}, ip);
      return NextResponse.json({ ok });
    }
    if (body.uid) {
      const ok = await removeTeamMember(body.uid);
      await logAdminAction(adminUid!, "team.removed", "user", body.uid, {}, ip);
      return NextResponse.json({ ok });
    }
    return NextResponse.json({ error: "Nothing specified." }, { status: 400 });
  } catch (err) {
    console.error("[admin/invites] delete failed:", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}
