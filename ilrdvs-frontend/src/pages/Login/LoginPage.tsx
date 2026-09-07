import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { login } from "../../services/auth.service";
import { useAuth } from "../../lib/AuthContext";
import { useToast } from "../../components/ui/Toast";

export function LoginPage() {
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
      setError("Please enter your email address and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await login({ email, password });
      setCurrentUser(res.user);
      push("success", "Signed in successfully.");
      navigate("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to sign in. Please check your credentials and try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="min-h-screen flex bg-surface">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[46%] relative bg-navy-950 text-white flex-col justify-between overflow-hidden">
        <div
          className="absolute inset-0 opacity-25 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(14,26,22,0.4), rgba(14,26,22,0.92)), repeating-linear-gradient(45deg, #315b4c 0, #315b4c 2px, transparent 2px, transparent 40px)",
          }}
        />
        <div className="relative z-10 px-12 pt-10">
          <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
            <span className="h-1.5 w-6 bg-saffron rounded-sm" />
            <span className="h-1.5 w-6 bg-white rounded-sm" />
            <span className="h-1.5 w-6 bg-tricolor-green rounded-sm" />
            <span className="ml-2 tracking-wide">GOVERNMENT OF INDIA</span>
          </div>
        </div>

        <div className="relative z-10 px-12">
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            From legacy records
            <br />
            to a digital tomorrow.
          </h1>
          <p className="mt-4 text-slate-300 text-sm max-w-md leading-relaxed">
            The Intelligent Land Record Digitization and Validation System converts
            handwritten and scanned land records into trusted digital records — using AI
            extraction, structured validation, and human verification.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-6 max-w-md">
            <div>
              <p className="text-2xl font-bold">1.2 Cr+</p>
              <p className="text-xs text-slate-400 mt-0.5">Records digitized</p>
            </div>
            <div>
              <p className="text-2xl font-bold">28</p>
              <p className="text-xs text-slate-400 mt-0.5">States onboarded</p>
            </div>
            <div>
              <p className="text-2xl font-bold">94.7%</p>
              <p className="text-xs text-slate-400 mt-0.5">Processing accuracy</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-12 pb-10 flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-brand-300" />
          Secured government infrastructure · Data encrypted in transit and at rest
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="h-10 w-10 rounded-md bg-brand-600 flex items-center justify-center text-white font-bold">IL</div>
            <div>
              <p className="font-bold text-navy-900 leading-tight">ILRDVS</p>
              <p className="text-[11px] text-slate-500 leading-tight">Ministry of Rural Development</p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3 mb-8">
            <div className="h-11 w-11 rounded-md bg-brand-600 flex items-center justify-center text-white font-bold text-lg">
              IL
            </div>
            <div>
              <p className="font-bold text-navy-900 text-lg leading-tight">ILRDVS</p>
              <p className="text-xs text-slate-500 leading-tight">Intelligent Land Record Digitization &amp; Validation System</p>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-navy-900">Welcome back</h2>
          <p className="text-sm text-slate-500 mt-1 mb-6">Sign in with your officer credentials to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Email Address</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. officer@gov.in"
                  autoComplete="email"
                  className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-md border border-slate-300 pl-9 pr-9 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
                <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-danger-500 bg-danger-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                Remember me
              </label>
              <button type="button" className="text-brand-600 font-medium hover:underline">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </button>


          </form>

          <div className="mt-10 pt-6 border-t border-slate-100 flex items-center gap-2.5 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-brand-500 shrink-0" />
            This is a government system. Unauthorized access is prohibited and monitored under
            applicable IT laws.
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-400">
            Ministry of Rural Development · Government of India
          </p>
        </div>
      </div>
    </div>
  );
}
