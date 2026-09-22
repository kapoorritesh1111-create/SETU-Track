// src/app/api/admin/invitations/route.ts
import { NextResponse } from "next/server";
import { requireRole } from "../../../../lib/api/gates";

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SETUE_URL ||
    "https://setutrack.com"
  ).replace(/\/$/, "");
}

export async function GET(req: Request) {
  try {
    const gate = await requireRole(req, ["owner", "admin"], "id, org_id, role");
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    const { supa } = gate;
    const { data: profiles, error: profileErr } = await supa
      .from("profiles")
      .select("id")
      .eq("org_id", gate.profile.org_id);

    if (profileErr) return NextResponse.json({ ok: false, error: profileErr.message }, { status: 400 });

    const allowedIds = new Set((profiles ?? []).map((p: any) => p.id));
    const { data, error } = await supa.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    const users = (data?.users ?? [])
      .filter((u: any) => allowedIds.has(u.id))
      .map((u: any) => {
        const created_at = u.created_at || null;
        const last_sign_in_at = u.last_sign_in_at || null;
        const email_confirmed_at = u.email_confirmed_at || u.confirmed_at || null;
        const status = last_sign_in_at || email_confirmed_at ? "active" : "pending";
        return {
          id: u.id,
          email: u.email || "",
          status,
          invited_at: u.invited_at || created_at,
          created_at,
          last_sign_in_at,
          email_confirmed_at,
        };
      });

    users.sort((a: any, b: any) => {
      if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    return NextResponse.json({ ok: true, users });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requireRole(req, ["owner", "admin"], "id, org_id, role");
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    const body = await req.json().catch(() => null);
    const email = String(body?.email || "").trim().toLowerCase();
    if (!email) return NextResponse.json({ ok: false, error: "Email required" }, { status: 400 });

    const { data: authList, error: listErr } = await gate.supa.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) return NextResponse.json({ ok: false, error: listErr.message }, { status: 400 });

    const user = (authList?.users ?? []).find((u: any) => String(u.email || "").toLowerCase() === email);
    if (!user) return NextResponse.json({ ok: false, error: "Invitation user not found" }, { status: 404 });

    const { data: profile } = await gate.supa.from("profiles").select("org_id").eq("id", user.id).maybeSingle();
    if (profile?.org_id !== gate.profile.org_id) {
      return NextResponse.json({ ok: false, error: "Invitation does not belong to this organization" }, { status: 403 });
    }

    const redirectTo = `${siteUrl()}/auth/callback`;
    const { data, error } = await gate.supa.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo },
    } as any);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    const action_link = (data as any)?.properties?.action_link || (data as any)?.action_link || null;
    if (!action_link) return NextResponse.json({ ok: false, error: "Invite link not available" }, { status: 400 });

    return NextResponse.json({ ok: true, action_link });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const gate = await requireRole(req, ["owner", "admin"], "id, org_id, role");
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    const body = await req.json().catch(() => null);
    const user_id = String(body?.user_id || "").trim();
    if (!user_id) return NextResponse.json({ ok: false, error: "user_id required" }, { status: 400 });

    const { data: target, error: targetErr } = await gate.supa
      .from("profiles")
      .select("id, org_id, role")
      .eq("id", user_id)
      .maybeSingle();

    if (targetErr) return NextResponse.json({ ok: false, error: targetErr.message }, { status: 400 });
    if (!target || target.org_id !== gate.profile.org_id) {
      return NextResponse.json({ ok: false, error: "User does not belong to this organization" }, { status: 403 });
    }
    if (target.role === "owner" && gate.profile.role !== "owner") {
      return NextResponse.json({ ok: false, error: "Only an Owner can cancel an Owner invitation" }, { status: 403 });
    }
    if (target.id === gate.profile.id) {
      return NextResponse.json({ ok: false, error: "You cannot cancel your own account" }, { status: 400 });
    }

    await gate.supa.from("project_members").delete().eq("org_id", gate.profile.org_id).eq("user_id", user_id);
    await gate.supa.from("time_entries").delete().eq("org_id", gate.profile.org_id).eq("user_id", user_id);
    await gate.supa.from("profiles").delete().eq("org_id", gate.profile.org_id).eq("id", user_id);

    const { error } = await gate.supa.auth.admin.deleteUser(user_id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
