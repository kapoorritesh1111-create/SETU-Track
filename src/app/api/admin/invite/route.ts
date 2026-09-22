// src/app/api/admin/invite/route.ts
import { NextResponse } from "next/server";
import { requireRole } from "../../../../lib/api/gates";

type Role = "owner" | "admin" | "manager" | "contractor";

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SETUE_URL ||
    "https://setutrack.com"
  ).replace(/\/$/, "");
}

export async function POST(req: Request) {
  try {
    const gate = await requireRole(req, ["owner", "admin"], "id, org_id, role");
    if (!gate.ok) {
      return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });

    const email = String(body.email || "").trim().toLowerCase();
    const full_name = String(body.full_name || "").trim();
    const hourly_rate = Number(body.hourly_rate ?? 0);
    const role = String(body.role || "contractor") as Role;
    const manager_id = body.manager_id ? String(body.manager_id) : null;
    const project_ids = (Array.isArray(body.project_ids) ? body.project_ids : [])
      .map((x: unknown) => String(x || "").trim())
      .filter(Boolean);

    if (!email) return NextResponse.json({ ok: false, error: "Email required" }, { status: 400 });
    if (!["owner", "admin", "manager", "contractor"].includes(role)) {
      return NextResponse.json({ ok: false, error: "Invalid role" }, { status: 400 });
    }
    if (role === "owner" && gate.profile.role !== "owner") {
      return NextResponse.json({ ok: false, error: "Only an Owner can invite another Owner" }, { status: 403 });
    }
    if (Number.isNaN(hourly_rate) || hourly_rate < 0) {
      return NextResponse.json({ ok: false, error: "Hourly rate invalid" }, { status: 400 });
    }

    const { supa } = gate;

    // Prevent an existing identity from being silently moved between tenants.
    const { data: authList, error: authListError } = await supa.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authListError) {
      return NextResponse.json({ ok: false, error: authListError.message }, { status: 400 });
    }
    const existingAuth = (authList?.users ?? []).find((u: any) => String(u.email || "").toLowerCase() === email);
    if (existingAuth) {
      const { data: existingProfile } = await supa
        .from("profiles")
        .select("id, org_id")
        .eq("id", existingAuth.id)
        .maybeSingle();

      if (existingProfile?.org_id && existingProfile.org_id !== gate.profile.org_id) {
        return NextResponse.json(
          { ok: false, error: "This email already belongs to another SETU Track organization." },
          { status: 409 }
        );
      }
    }

    const redirectTo = `${siteUrl()}/auth/callback`;

    const { data: inviteData, error: inviteErr } = await supa.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { full_name },
    } as any);
    if (inviteErr) return NextResponse.json({ ok: false, error: inviteErr.message }, { status: 400 });

    const invitedUserId = inviteData.user?.id;
    if (!invitedUserId) {
      return NextResponse.json({ ok: false, error: "Invite created but missing user id" }, { status: 400 });
    }

    const payload = {
      id: invitedUserId,
      org_id: gate.profile.org_id,
      role,
      full_name: full_name || null,
      hourly_rate: role === "contractor" ? hourly_rate : 0,
      is_active: true,
      manager_id: role === "contractor" ? manager_id : null,
    };

    const { error: upErr } = await supa.from("profiles").upsert(payload, { onConflict: "id" });
    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 });

    if (project_ids.length > 0) {
      const { data: validProjects, error: projErr } = await supa
        .from("projects")
        .select("id")
        .eq("org_id", gate.profile.org_id)
        .in("id", project_ids);

      if (projErr) return NextResponse.json({ ok: false, error: projErr.message }, { status: 400 });

      const validIds = new Set(((validProjects as any) ?? []).map((p: any) => p.id));
      const invalid = project_ids.filter((id: string) => !validIds.has(id));
      if (invalid.length) {
        return NextResponse.json(
          { ok: false, error: `Invalid project(s) for this org: ${invalid.join(", ")}` },
          { status: 400 }
        );
      }

      const memberRows = project_ids.map((pid: string) => ({
        org_id: gate.profile.org_id,
        project_id: pid,
        user_id: invitedUserId,
        profile_id: invitedUserId,
        is_active: true,
      }));

      const { error: memErr } = await supa
        .from("project_members")
        .upsert(memberRows as any, { onConflict: "project_id,user_id" });

      if (memErr) return NextResponse.json({ ok: false, error: memErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, userId: invitedUserId, role });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
