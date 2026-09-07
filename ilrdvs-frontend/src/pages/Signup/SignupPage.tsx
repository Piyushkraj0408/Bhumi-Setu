import { useState, useId } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  User,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileSpreadsheet,
  Building2,
  AlertCircle,
  Landmark,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { signup } from "../../services/auth.service";
import { useAuth } from "../../lib/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { LanguageSelector } from "../../components/ui/LanguageSelector";

interface RoleOption {
  id: string;
  name: string;
  desc: string;
  icon: typeof FileSpreadsheet;
  badge: string;
}

export function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();
  const { push } = useToast();

  const nameInputId = useId();
  const emailInputId = useId();
  const passwordInputId = useId();
  const confirmPasswordInputId = useId();
  const scopeInputId = useId();
  const termsCheckboxId = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState("citizen");
  const [scopeId, setScopeId] = useState("TH-HAVELI");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const roles: RoleOption[] = [
    {
      id: "citizen",
      name: t("signup.roleCitizen", "Citizen / Land Consumer (Land Owner)"),
      desc: t("signup.roleCitizenDesc", "Search land records, view 7/12 & RoR details, inspect parcels on GIS map"),
      icon: Landmark,
      badge: "Public Consumer Access",
    },
    {
      id: "tehsil_officer",
      name: t("signup.roleTehsil", "Tehsil / Data Entry Officer"),
      desc: t("signup.roleTehsilDesc", "Upload & digitize cadastral records, RoR & 7/12 extracts"),
      icon: FileSpreadsheet,
      badge: "Data Entry & OCR",
    },
    {
      id: "verification_officer",
      name: t("signup.roleVerifier", "Verification / HITL Officer"),
      desc: t("signup.roleVerifierDesc", "Review AI extractions, resolve flags & approve verified records"),
      icon: FileCheck2,
      badge: "HITL Verification",
    },
    {
      id: "auditor",
      name: t("signup.roleAuditor", "Auditor / Land Inspector"),
      desc: t("signup.roleAuditorDesc", "Inspect compliance audit trails and verified land parcels"),
      icon: ShieldCheck,
      badge: "Audit & Compliance",
    },
  ];

  // Password strength calculation
  const getPasswordStrength = (pw: string) => {
    if (!pw) return { score: 0, label: "", color: "bg-slate-200", text: "text-slate-400" };
    let score = 0;
    if (pw.length >= 6) score += 1;
    if (pw.length >= 10) score += 1;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
    if (/[0-9]/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;

    if (score <= 2) return { score, label: "Weak", color: "bg-rose-500", text: "text-rose-600" };
    if (score <= 4) return { score, label: "Good", color: "bg-amber-500", text: "text-amber-600" };
    return { score, label: "Strong", color: "bg-emerald-600", text: "text-emerald-700" };
  };

  const strength = getPasswordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError(t("signup.errorName", "Please enter your full name."));
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError(t("signup.errorEmail", "Please provide a valid email address."));
      return;
    }
    if (!password || password.length < 6) {
      setError(t("signup.passwordWeak", "Password must be at least 6 characters long."));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("signup.passwordMismatch", "Passwords do not match."));
      return;
    }
    if (!agreeTerms) {
      setError(t("signup.termsRequired", "Please accept the data governance terms to proceed."));
      return;
    }

    setLoading(true);
    try {
      const scopeType = selectedRole === "tehsil_officer" || selectedRole === "verification_officer" ? "tehsil" : null;
      const effectiveScopeId = selectedRole === "citizen" ? null : (scopeId ? scopeId.trim() : null);
      const res = await signup({
        name: name.trim(),
        email: email.trim(),
        password,
        role_name: selectedRole,
        scope_type: scopeType,
        scope_id: effectiveScopeId,
      });

      setCurrentUser(res.user);
      push("success", t("signup.successSignUp", "Account created successfully! Welcome to BhoomiSetu."));
      navigate("/dashboard");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : t("login.errorInvalid", "Unable to create account. Please try again.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-slate-900 via-navy-950 to-[#071912] text-slate-100 relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[130px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full flex items-center justify-between px-6 sm:px-12 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden shadow-md ring-1 ring-emerald-500/30 bg-white flex items-center justify-center shrink-0">
            <img
              src="/logo.png"
              alt="BhoomiSetu"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <div className="text-left">
            <p className="text-[13px] font-black tracking-tight text-slate-100">
              Bhoomi<span className="text-emerald-400">Setu</span>
            </p>
            <p className="text-[10px] text-slate-400 font-medium tracking-wider">
              rooted in land, connected by trust
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSelector variant="login" />
        </div>
      </header>

      {/* Main Center Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[540px] bg-white/95 backdrop-blur-xl p-8 sm:p-9 rounded-3xl border border-white/20 shadow-2xl shadow-black/40 text-slate-800 relative overflow-hidden transition-all duration-300 hover:shadow-emerald-950/20">
          
          {/* Top Tricolor Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />

          {/* Government of India Brand Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative group mb-2.5">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-[#FF9933] via-white to-[#138808] rounded-full blur-xs opacity-30 group-hover:opacity-60 transition duration-300" />
              <div className="relative w-16 h-16 rounded-full bg-white shadow-md flex flex-col items-center justify-center ring-2 ring-slate-200 overflow-hidden">
                {/* Tricolor stripes */}
                <div className="absolute top-0 left-0 right-0 h-[33%] bg-[#FF9933]" />
                <div className="absolute top-[33%] left-0 right-0 h-[34%] bg-white" />
                <div className="absolute bottom-0 left-0 right-0 h-[33%] bg-[#138808]" />
                {/* Ashoka Chakra */}
                <div className="relative z-10 w-7 h-7 rounded-full border-[2.5px] border-[#000080] bg-white flex items-center justify-center">
                  <span className="text-[#000080] text-[7px] font-black">☸</span>
                </div>
              </div>
            </div>

            <h1 className="text-xl font-black tracking-widest text-navy-950 uppercase">
              {t("login.govIndia", "GOVERNMENT OF INDIA")}
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {t("signup.subtitle", "Join BhoomiSetu Digital Land Records Platform")}
            </p>
          </div>

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name */}
            <div>
              <label htmlFor={nameInputId} className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t("signup.fullNameLabel", "Full Name")} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id={nameInputId}
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("signup.fullNamePlaceholder", "e.g. Rajesh Kumar")}
                  autoComplete="name"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor={emailInputId} className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t("signup.emailLabel", "Official / Email Address")} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id={emailInputId}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={selectedRole === "citizen" ? "citizen@gmail.com" : t("signup.emailPlaceholder", "officer@gov.in")}
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t("signup.roleLabel", "Designation / Portal Role")} <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                {roles.map((r) => {
                  const Icon = r.icon;
                  const isSelected = selectedRole === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRole(r.id)}
                      className={`cursor-pointer rounded-xl p-3 border text-left transition-all flex items-start gap-3 ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-500/30"
                          : "border-slate-200 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                          isSelected
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-bold ${isSelected ? "text-emerald-950" : "text-slate-800"}`}>
                            {r.name}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              isSelected
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200/70 text-slate-600"
                            }`}
                          >
                            {r.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                          {r.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Optional Scope Code for Officers */}
            {selectedRole !== "citizen" && (
              <div>
                <label htmlFor={scopeInputId} className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>{t("signup.scopeLabel", "Jurisdiction / Tehsil Code")}</span>
                  <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id={scopeInputId}
                    type="text"
                    value={scopeId}
                    onChange={(e) => setScopeId(e.target.value)}
                    placeholder="e.g. TH-HAVELI or D-PUNE"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Password Fields in 2 columns on larger screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Password */}
              <div>
                <label htmlFor={passwordInputId} className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t("signup.passwordLabel", "Password")} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id={passwordInputId}
                    type={showPw ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-9 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  >
                    {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor={confirmPasswordInputId} className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t("signup.confirmPasswordLabel", "Confirm Password")} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id={confirmPasswordInputId}
                    type={showConfirmPw ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full rounded-xl border pl-10 pr-9 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white outline-none transition-all ${
                      confirmPassword && password !== confirmPassword
                        ? "border-rose-400 bg-rose-50/30 focus:border-rose-600 focus:ring-4 focus:ring-rose-500/10"
                        : confirmPassword && password === confirmPassword
                        ? "border-emerald-500 bg-emerald-50/20 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10"
                        : "border-slate-200 bg-slate-50/50 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  >
                    {showConfirmPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Password Strength:</span>
                  <span className={`font-bold ${strength.text}`}>{strength.label}</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden flex gap-1">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${strength.color}`}
                    style={{ width: `${Math.min(100, strength.score * 20)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Message Alert */}
            {error && (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Terms and Governance Agreement */}
            <div className="pt-1">
              <label htmlFor={termsCheckboxId} className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  id={termsCheckboxId}
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 h-4 w-4 shrink-0 mt-0.5"
                />
                <span className="leading-snug text-[11.5px]">
                  {t(
                    "signup.termsAgree",
                    "I agree to the Digital India Land Records data governance and official security guidelines."
                  )}
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer mt-3"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t("signup.creatingAccount", "Creating account…")}</span>
                </>
              ) : (
                <>
                  <span>{t("signup.submitBtn", "Create Account & Proceed")}</span>
                  <ArrowRight className="h-4 w-4 ml-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Switch to Login Link */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-600 text-center">
            <span>{t("signup.alreadyHaveAccount", "Already have an account?")}</span>
            <Link
              to="/login"
              className="text-emerald-700 font-bold hover:underline hover:text-emerald-800 transition-colors"
            >
              {t("signup.signInHere", "Sign in")}
            </Link>
          </div>

          {/* Security Subtext */}
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Instant Provisioning • Multi-layered Cryptographic Security</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 px-6 text-center text-[11px] text-slate-400 max-w-7xl mx-auto w-full">
        <p>{t("login.ministry", "Ministry of Electronics & IT — DILRMP Initiative")}</p>
      </footer>
    </div>
  );
}
