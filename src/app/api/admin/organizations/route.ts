import { NextResponse } from "next/server";
import { supabaseService } from "../../../../lib/supabaseServer";

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SETUE_URL ||
    "https://setutrack.com"
  ).replace(/\/$/, "");
}

async function requirePlatformAdmin(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return { ok: false as const, status: 401, error: "Missing auth token" };

  const supa = supabaseService();
  const { data: caller, error: callerErr } = await supa.auth.getUser(token);
  if (callerErr || !caller?.user) return { ok: false as const, status: 401, error: "Unauthorized" };

  const { data: platformAdmin, error: platformErr } = await supa
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", caller.user.id)
    .maybeSingle();

  if (platformErr) return { ok: false as const, status: 400, error: platformErr.message };
  if (!platformAdmin) return { ok: false as const, status: 403, error: "Platform Super Admin only" };

  return { ok: true as const, supa, userId: caller.user.id };
}

export async function GET(req: Request) {
  const gate = await requirePlatformAdmin(req);
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const { data: orgs, error: orgErr } = await gate.supa
    .from("orgs")
    .select("id, name, created_at")
    .order("created_at", { ascending: true });

  if (orgErr) return NextResponse.json({ ok: false, error: orgErr.message }, { status: 400 });

  const { data: profiles, error: profileErr } = await gate.supa
    .from("profiles")
    .select("id, org_id, role, is_active");

  if (profileErr) return NextResponse.json({ ok: false, error: profileErr.message }, { status: 400 });

  const rows = (orgs ?? []).map((org: any) => {
    const members = (profiles ?? []).filter((p: any) => p.org_id === org.id);
    return {
      ...org,
      member_count: members.length,
      owner_count: members.filter((p: any) => p.role === "owner" && p.is_active !== false).length,
      admin_count: members.filter((p: any) => p.role === "admin" && p.is_active !== false).length,
    };
  });

  return NextResponse.json({ ok: true, organizations: rows });
}

export async function POST(req: Request) {
  const gate = await requirePlatformAdmin(req);
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const body = await req.json().catch(() => null);
  const name = String(body?.name || "").trim();
  const ownerName = String(body?.owner_name || "").trim();
  const ownerEmail = String(body?.owner_email || "").trim().toLowerCase();
  const currency = String(body?.default_currency || "USD").trim().toUpperCase();

  if (!name) return NextResponse.json({ ok: false, error: "Organization name required" }, { status: 400 });
  if (!ownerEmail) return NextResponse.json({ ok: false, error: "Owner email required" }, { status: 400 });

  const { data: existingOrgs, error: existingOrgErr } = await gate.supa
    .from("orgs")
    .select("id, name");

  if (existingOrgErr) return NextResponse.json({ ok: false, error: existingOrgErr.message }, { status: 400 });
  const duplicate = (existingOrgs ?? []).find((o: any) => String(o.name || "").trim().toLowerCase() === name.toLowerCase());
  if (duplicate) {
    return NextResponse.json({ ok: false, error: "An organization with this name already exists." }, { status: 409 });
  }

  const { data: authList, error: authListErr } = await gate.supa.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authListErr) return NextResponse.json({ ok: false, error: authListErr.message }, { status: 400 });
  const existingAuth = (authList?.users ?? []).find((u: any) => String(u.email || "").toLowerCase() === ownerEmail);
  if (existingAuth) {
    const { data: existingProfile } = await gate.supa
      .from("profiles")
      .select("org_id")
      .eq("id", existingAuth.id)
      .maybeSingle();
    if (existingProfile?.org_id) {
      return NextResponse.json(
        { ok: false, error: "Owner email already belongs to another SETU Track organization." },
        { status: 409 }
      );
    }
  }

  const { data: org, error: orgErr } = await gate.supa
    .from("orgs")
    .insert({ name })
    .select("id, name, created_at")
    .single();

  if (orgErr || !org) {
    return NextResponse.json({ ok: false, error: orgErr?.message || "Organization creation failed" }, { status: 400 });
  }

  const { error: settingsErr } = await gate.supa.from("org_settings").insert({
    org_id: org.id,
    company_name: name,
    legal_name: name,
    default_currency: currency || "USD",
    accent_color: "#22C7BE",
    invoice_header_json: {},
    invoice_footer_text: "",
    updated_by: gate.userId,
  });

  if (settingsErr) {
    await gate.supa.from("orgs").delete().eq("id", org.id);
    return NextResponse.json({ ok: false, error: settingsErr.message }, { status: 400 });
  }

  const redirectTo = `${siteUrl()}/auth/callback`;
  const { data: inviteData, error: inviteErr } = await gate.supa.auth.admin.inviteUserByEmail(ownerEmail, {
    redirectTo,
    data: { full_name: ownerName, organization_name: name },
  } as any);

  if (inviteErr || !inviteData.user?.id) {
    await gate.supa.from("org_settings").delete().eq("org_id", org.id);
    await gate.supa.from("orgs").delete().eq("id", org.id);
    return NextResponse.json({ ok: false, error: inviteErr?.message || "Owner invitation failed" }, { status: 400 });
  }

  const { error: profileErr } = await gate.supa.from("profiles").upsert({
    id: inviteData.user.id,
    org_id: org.id,
    full_name: ownerName || ownerEmail.split("@")[0],
    role: "owner",
    hourly_rate: 0,
    is_active: true,
    manager_id: null,
  }, { onConflict: "id" });

  if (profileErr) {
    await gate.supa.auth.admin.deleteUser(inviteData.user.id);
    await gate.supa.from("org_settings").delete().eq("org_id", org.id);
    await gate.supa.from("orgs").delete().eq("id", org.id);
    return NextResponse.json({ ok: false, error: profileErr.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    organization: org,
    owner: { id: inviteData.user.id, email: ownerEmail, role: "owner" },
  });
}
