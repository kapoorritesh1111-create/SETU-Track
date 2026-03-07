"use client";

export default function AdminTabs({
  active,
}: {
  active: "users" | "invitations" | "exports" | "billing" | "org-settings" | "invite";
}) {
  const linkStyle = (isActive: boolean) => ({
    textDecoration: "none",
    opacity: isActive ? 1 : 0.85,
    borderColor: isActive ? "rgba(255,255,255,0.18)" : undefined,
  });

  return (
    <div className="card cardPad" style={{ width: "100%", marginBottom: 12 }}>
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <a className="pill" href="/admin/users" style={linkStyle(active === "users")}>
          Members
        </a>
        <a className="pill" href="/admin/invitations" style={linkStyle(active === "invitations")}>
          Invitations
        </a>
        <a className="pill" href="/admin/billing" style={linkStyle(active === "billing")}>
          Billing
        </a>
        <a className="pill" href="/admin/exports" style={linkStyle(active === "exports")}>
          Exports
        </a>
        <a className="pill" href="/admin/org-settings" style={linkStyle(active === "org-settings")}>
          Org Settings
        </a>
        <a className="pill" href="/admin?invite=1" style={linkStyle(active === "invite")}>
          Invite
        </a>
      </div>

      <div className="muted" style={{ marginTop: 8 }}>
        Admin workspace for members, invitations, billing, exports, and organization settings.
      </div>
    </div>
  );
}
