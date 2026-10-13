import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, User, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import divyadipLogo from "../assets/images/divyadip-logo.jpeg";

/* Spacing classes use the "!" prefix so they work with a global CSS reset. */

const Login = () => {
  const { user, login, notice, clearNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    clearNotice();
    setBusy(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
      setPassword("");
      setBusy(false);
    }
  };

  const inputWrap =
    "flex items-center gap-3 rounded-xl border border-slate-200 bg-white !px-3.5 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20";
  const inputCls = "w-full bg-transparent !py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 !p-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-slate-200/70 bg-white !p-8 shadow-xl shadow-slate-200/60">
          <div className="flex flex-col items-center">
            <div className="w-40 overflow-hidden">
              <img src={divyadipLogo} alt="Divyadip Enterprises" className="block h-auto w-full scale-[1.08] object-contain" />
            </div>
            <div className="!mt-3 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              <span className="text-xs font-semibold tracking-[0.35em] text-slate-500">ERP SYSTEM</span>
              <span className="h-2 w-2 rounded-full bg-orange-500" />
            </div>
          </div>

          <h1 className="!mt-8 text-2xl font-bold text-slate-900">Sign in</h1>
          <p className="!mt-1 text-sm text-slate-500">Enter your details to open the ERP.</p>

          {notice && (
            <p className="!mt-4 rounded-xl bg-amber-50 !px-4 !py-3 text-sm font-medium text-amber-800">{notice}</p>
          )}

          <form onSubmit={submit} className="!mt-5 flex flex-col gap-4" autoComplete="on">
            <div>
              <label htmlFor="username" className="!mb-1.5 block text-sm font-medium text-slate-700">
                Username
              </label>
              <div className={inputWrap}>
                <User className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={inputCls}
                  placeholder="Your username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="!mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className={inputWrap}>
                <Lock className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                  placeholder="Your password"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="shrink-0 rounded-lg !p-1 text-slate-400 hover:text-slate-600"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <p className="rounded-xl bg-red-50 !px-4 !py-3 text-sm font-medium text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={busy || !username || !password}
              className="!mt-1 rounded-xl bg-orange-600 !px-5 !py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="!mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" /> Authorised users only. Forgot your password? Ask the administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;