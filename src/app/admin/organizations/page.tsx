"use client";

import { useEffect, useState } from "react";
import RequireOnboarding from "../../../components/auth/RequireOnboarding";
import AppShell from "../../../components/layout/AppShell";
import { supabase } from "../../../lib/supabaseBrowser";

type OrgRow = {
  id: string;
  name: string;
  created_at: string;
  member_count: number;
  owner_count: number;
  admin_count: number;
};

export default function OrganizationsPage() {
  return (
    <RequireOnboarding>
      <OrganizationsInner />
    </RequireOnboarding>
  );
}

function OrganizationsInner() {
  const [rows, setRows] = useState<OrgRow[]>([]);
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function token() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  }

  async function load() {
    setLoading(true);
    setMsg("");
    const accessToken = await token();
    const res = await fetch("/api/admin/organizations", {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok || !json.ok) {
      setRows([]);
      setMsg(json?.error || "Could not load organizations.");
      return;
    }
    setRows(json.organizations || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createOrganization(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const accessToken = await token();
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name,
          owner_name: ownerName,
          owner_email: ownerEmail,
          default_currency: currency,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg(json?.error || "Organization creation failed.");
        return;
      }
      setMsg(`Created ${json.organization.name} and sent the Owner invitation.`);
      setName("");
      setOwnerName("");
      setOwnerEmail("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Organizations" subtitle="Platform Super Admin tenant provisioning">
      <div style={{ maxWidth: 1100 }}>
        {msg ? <div className="card cardPad" style={{ marginBottom: 12 }}>{msg}</div> : null}

        <div className="card cardPad">
          <div className="h2">Add organization</div>
          <div className="muted" style={{ marginTop: 4 }}>
            Creates a tenant workspace and sends the first Owner invite through Supabase Auth.
          </div>

          <form onSubmit={createOrganization} className="mwForm" style={{ marginTop: 14 }}>
            <div className="mwField">
              <div className="mwLabel">Organization name</div>
              <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Avanti" />
            </div>
            <div className="mwField">
              <div className="mwLabel">Owner name</div>
              <input className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Ritesh Kapoor" />
            </div>
            <div className="mwField">
              <div className="mwLabel">Owner email</div>
              <input className="input" type="email" required value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="owner@company.com" />
            </div>
            <div className="mwField">
              <div className="mwLabel">Default currency</div>
              <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="INR">INR</option>
                <option value="CAD">CAD</option>
              </select>
            </div>
            <div className="mwField" style={{ alignSelf: "end" }}>
              <button className="btn btnPrimary" disabled={busy}>
                {busy ? "Creating..." : "Create organization"}
              </button>
            </div>
          </form>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div className="cardPad">
            <div className="h2">Organizations</div>
            <div className="muted">{loading ? "Loading..." : `${rows.length} tenant organization(s)`}</div>
          </div>
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Owners</th>
                  <th>Super Admins</th>
                  <th>Members</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.name}</strong><div className="muted mono">{row.id}</div></td>
                    <td>{row.owner_count}</td>
                    <td>{row.admin_count}</td>
                    <td>{row.member_count}</td>
                    <td>{new Date(row.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
