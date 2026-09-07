import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Lock, User, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { login } from "../../services/auth.service";
import { useAuth } from "../../lib/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { LanguageSelector } from "../../components/ui/LanguageSelector";

export function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();
  const { push } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError(t("login.errorEmpty", "Please enter your email address and password."));
      return;
    }
    setLoading(true);
    try {
      const res = await login({ email, password });
      setCurrentUser(res.user);
      push("success", t("login.successSignIn", "Signed in successfully."));
      navigate("/dashboard");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : t("login.errorInvalid", "Unable to sign in. Please check your credentials and try again.");
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

      {/* Top Header Bar */}
      <header className="relative z-10 w-full flex items-center justify-between px-6 sm:px-12 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-4 bg-[#FF9933] rounded-xs" />
              <span className="h-1.5 w-4 bg-white rounded-xs" />
              <span className="h-1.5 w-4 bg-[#138808] rounded-xs" />
            </div>
          </div>
          <div className="text-left">
            <p className="text-[11px] font-bold tracking-widest text-slate-200 uppercase">
              {t("login.govIndia", "GOVERNMENT OF INDIA")}
            </p>
            <p className="text-[10px] text-slate-400 font-medium tracking-wider">
              DILRMP • Digital India Land Records
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSelector variant="login" />
        </div>
      </header>

      {/* Main Center Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-[430px] bg-white/95 backdrop-blur-xl p-8 sm:p-9 rounded-3xl border border-white/20 shadow-2xl shadow-black/40 text-slate-800 relative overflow-hidden transition-all duration-300 hover:shadow-emerald-950/20">
          
          {/* Top Tricolor Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />

          {/* Logo & Brand Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative group mb-3">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur-xs opacity-40 group-hover:opacity-70 transition duration-300" />
              <div className="relative w-20 h-20 rounded-full p-1 bg-white shadow-lg flex items-center justify-center overflow-hidden ring-1 ring-slate-100">
                <img
                  src="/logo.png"
                  alt="BhoomiSetu"
                  className="w-full h-full object-cover rounded-full transform group-hover:scale-105 transition duration-300"
                />
              </div>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-navy-950">
              Bhoomi<span className="text-emerald-700">Setu</span>
            </h1>
            <p className="text-[12px] font-semibold text-emerald-800 tracking-wide mt-0.5">
              rooted in land, connected by trust
            </p>
          </div>

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t("login.emailLabel", "Email address")}
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("login.emailPlaceholder", "officer@gov.in")}
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t("login.passwordLabel", "Password")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("login.passwordPlaceholder", "••••••••")}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-0.5">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 h-3.5 w-3.5"
                />
                <span>{t("login.rememberMe", "Remember me")}</span>
              </label>
              <button type="button" className="text-emerald-700 font-semibold hover:underline">
                {t("login.forgotPassword", "Forgot password?")}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-bold py-2.5 rounded-xl shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer mt-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>{t("login.signIn", "Sign in")}</span>
                  <ArrowRight className="h-4 w-4 ml-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Security Subtext */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Encrypted • Role-based access controlled</span>
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


