"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import BrandLockup from "../../components/brand/BrandLockup";
import { BRAND } from "../../config/brand";
import { supabase } from "../../lib/supabaseBrowser";

export default function LoginPage() {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();
  const infoId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setBusy(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setBusy(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    router.push("/dashboard");
  }

  async function handleForgotPassword() {
    setErrorMsg(null);
    setInfoMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg("Enter your work email first, then use reset password.");
      return;
    }

    setBusy(true);

    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    });

    setBusy(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setInfoMsg("Password reset email sent. Open the link in your inbox to create a new password.");
  }

  const describedBy = [errorMsg ? errorId : null, infoMsg ? infoId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className="setuLoginPage">
      <div className="setuLoginHero">
        <div className="setuLoginHeroInner">
          <BrandLockup
            className="setuLoginBrand"
            logoClassName="setuLoginLogo"
            taglineClassName="setuLoginTagline"
          />
          <div className="setuLoginEyebrow">Payroll command platform</div>
          <h1>Branded payroll operations, approvals, and export control in one SETU workspace.</h1>
          <p>
            Keep project time, payroll runs, receipts, and finance-ready exports aligned across admins, managers,
            and contractors.
          </p>

          <div className="setuLoginFeatureGrid">
            <div className="setuLoginFeatureCard">
              <ShieldCheck size={18} aria-hidden="true" />
              <div>
                <strong>Audit-ready payroll</strong>
                <span>Closed periods, immutable runs, receipt history, and paid-state tracking.</span>
              </div>
            </div>
            <div className="setuLoginFeatureCard">
              <LockKeyhole size={18} aria-hidden="true" />
              <div>
                <strong>Secure org access</strong>
                <span>Role-based admin, manager, and contractor access through Supabase auth.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="setuLoginPanelWrap">
        <div className="setuLoginPanel card">
          <div className="setuLoginPanelHeader">
            <div className="setuLoginMiniBadge">{BRAND.name}</div>
            <h2>Sign in</h2>
            <p>Use your organization email to continue to the payroll workspace.</p>
          </div>

          <form className="setuLoginForm" onSubmit={handleLogin} noValidate>
            <div className="setuLoginField">
              <label htmlFor={emailId}>Email</label>
              <div className="setuInputIconWrap">
                <Mail size={16} aria-hidden="true" />
                <input
                  id={emailId}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="input setuLoginInput"
                  aria-describedby={describedBy}
                />
              </div>
            </div>

            <div className="setuLoginField">
              <label htmlFor={passwordId}>Password</label>
              <div className="setuInputIconWrap setuPasswordWrap">
                <LockKeyhole size={16} aria-hidden="true" />
                <input
                  id={passwordId}
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="input setuLoginInput"
                  aria-describedby={describedBy}
                />
                <button
                  type="button"
                  className="setuPasswordToggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="setuLoginActionsRow">
              <button type="button" className="setuTextButton" onClick={handleForgotPassword} disabled={busy}>
                Reset password
              </button>
            </div>

            {errorMsg ? (
              <div id={errorId} className="alert alertError" role="alert" aria-live="polite">
                {errorMsg}
              </div>
            ) : null}
            {infoMsg ? (
              <div id={infoId} className="alert alertInfo" role="status" aria-live="polite">
                {infoMsg}
              </div>
            ) : null}

            <button type="submit" disabled={busy} className="btn btnPrimary btnMd setuLoginSubmit">
              {busy ? "Signing in…" : `Enter ${BRAND.name}`}
            </button>
          </form>

          <p className="setuLoginFooter">A product of {BRAND.parentCompany}.</p>
        </div>
      </div>
    </div>
  );
}
