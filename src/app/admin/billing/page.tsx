"use client";

import RequireOnboarding from "../../../components/auth/RequireOnboarding";
import AppShell from "../../../components/layout/AppShell";
import AdminTabs from "../../../components/admin/AdminTabs";
import { useProfile } from "../../../lib/useProfile";
import Button from "../../../components/ui/Button";
import WorkspaceKpiStrip from "../../../components/setu/WorkspaceKpiStrip";
import { CreditCard, ReceiptText, ShieldCheck, Wallet, ExternalLink } from "lucide-react";

export default function AdminBillingPage() {
  return (
    <RequireOnboarding>
      <AdminBillingInner />
    </RequireOnboarding>
  );
}

function AdminBillingInner() {
  const { profile, loading } = useProfile();
  const isAdmin = profile?.role === "admin";

  if (loading) return null;

  if (!isAdmin) {
    return (
      <AppShell title="Billing" subtitle="Admin only">
        <div className="card cardPad" style={{ maxWidth: 980 }}>
          <div className="muted">You do not have access to billing settings.</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Billing"
      subtitle="Future Stripe subscription structure, invoice routing, and billing operations readiness."
      right={
        <a className="btn btnSecondary btnMd setuLinkButton" href="/admin/org-settings">
          Billing settings <ExternalLink size={14} />
        </a>
      }
    >
      <section className="setuReportPage setuPageWide setuBillingPage">
        <AdminTabs active="billing" />

        <div className="setuHeroCard billingHeroCard">
          <div className="analyticsHeroCopy">
            <div className="setuSectionEyebrow">Stripe-ready foundation</div>
            <h2>Billing now has a production-shaped workspace instead of a placeholder box.</h2>
            <p>
              The surface is ready for Stripe customer, subscription, invoice, and portal wiring without redesigning the admin workflow later.
            </p>
          </div>
          <div className="billingHeroActions">
            <Button disabled icon={<CreditCard size={16} />}>Manage subscription</Button>
            <Button variant="secondary" disabled icon={<Wallet size={16} />}>Update payment method</Button>
          </div>
        </div>

        <WorkspaceKpiStrip
          items={[
            { label: "Plan state", value: "Trial", hint: "Admin-controlled stub until Stripe is connected" },
            { label: "Invoices", value: "Export-backed", hint: "Receipts + org invoice settings" },
            { label: "Payment rails", value: "Stripe", hint: "Portal and webhooks planned next" },
            { label: "Status", value: "Structure ready", hint: "Safe to wire without redesign" },
          ]}
        />

        <div className="setuContentGrid billingContentGrid">
          <div className="setuMainCard">
            <div className="setuCardHeaderRow">
              <div>
                <div className="setuSectionTitle">Subscription control surface</div>
                <div className="setuSectionHint">The page structure is prepared for future Stripe customer, subscription, and portal data.</div>
              </div>
            </div>

            <div className="billingStatusGrid">
              <div className="billingPanel">
                <div className="billingPanelIcon"><CreditCard size={18} /></div>
                <div>
                  <strong>Current plan</strong>
                  <div className="muted">Trial / internal baseline</div>
                </div>
              </div>
              <div className="billingPanel">
                <div className="billingPanelIcon"><ShieldCheck size={18} /></div>
                <div>
                  <strong>Billing status</strong>
                  <div className="muted">No live subscription yet</div>
                </div>
              </div>
              <div className="billingPanel">
                <div className="billingPanelIcon"><ReceiptText size={18} /></div>
                <div>
                  <strong>Invoice source</strong>
                  <div className="muted">Org settings + export ledger</div>
                </div>
              </div>
            </div>

            <div className="analyticsList analyticsListDense">
              <div className="analyticsListItem">
                <div>
                  <div className="analyticsListTitle">What will connect here later</div>
                  <div className="analyticsListMeta">The UI is intentionally production-shaped so Stripe can be added without redesigning admin workflows.</div>
                </div>
              </div>
              <div className="analyticsListItem">
                <div>
                  <div className="analyticsListTitle">Customer record</div>
                  <div className="analyticsListMeta">stripe_customer_id, legal billing identity, default payment method, and customer portal link.</div>
                </div>
              </div>
              <div className="analyticsListItem">
                <div>
                  <div className="analyticsListTitle">Subscription object</div>
                  <div className="analyticsListMeta">stripe_subscription_id, subscription_status, billing interval, plan tier, and current_period_end.</div>
                </div>
              </div>
              <div className="analyticsListItem">
                <div>
                  <div className="analyticsListTitle">Invoice history</div>
                  <div className="analyticsListMeta">Invoice headers already come from Org Settings, while payroll receipts already exist in Export Center.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="setuSideStack">
            <div className="setuSideCard">
              <div className="setuSectionTitle">Stripe integration readiness</div>
              <div className="setuSectionHint">Recommended schema and wiring order for the next phase.</div>
              <div className="billingChecklist">
                <div className="billingChecklistItem"><span className="pill ok">Ready</span><span>Billing page shell and navigation path</span></div>
                <div className="billingChecklistItem"><span className="pill ok">Ready</span><span>Invoice source references: Org Settings + Exports</span></div>
                <div className="billingChecklistItem"><span className="pill warn">Next</span><span>Create <code>org_billing</code> table and secure RLS</span></div>
                <div className="billingChecklistItem"><span className="pill warn">Next</span><span>Add Stripe webhook handlers for subscription lifecycle</span></div>
                <div className="billingChecklistItem"><span className="pill">Later</span><span>Customer portal actions and invoice download history</span></div>
              </div>
            </div>

            <div className="setuSideCard">
              <div className="setuSectionTitle">Invoice and receipt routing</div>
              <div className="setuSectionHint">Where billing-facing documents are already configured today.</div>
              <div className="setuActionCluster" style={{ marginTop: 14 }}>
                <a className="dbQuickBtn setuLinkButton" href="/admin/org-settings">
                  <strong>Org Settings</strong>
                  <span className="muted">Manage invoice header, footer, legal name, and currency defaults.</span>
                </a>
                <a className="dbQuickBtn setuLinkButton" href="/admin/exports">
                  <strong>Export Center</strong>
                  <span className="muted">Review receipts, export artifacts, and paid-state history.</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
