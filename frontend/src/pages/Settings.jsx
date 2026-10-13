import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

/* Spacing classes use the "!" prefix so they work with a global CSS reset. */

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white !px-3.5 !py-2.5 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20";
const labelCls = "!mb-1.5 block text-sm font-medium text-slate-700";

const Settings = () => {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (next.length < 10) return setError("New password must be at least 10 characters.");
    if (!/[A-Za-z]/.test(next) || !/[0-9]/.test(next)) return setError("Use both letters and numbers.");
    if (next !== confirm) return setError("The two new passwords do not match.");

    setSaving(true);
    try {
      const r = await api.changePassword(current, next);
      setSuccess(r.message);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-full flex-1 bg-slate-50 !p-8">
      <div>
        <p className="text-sm font-semibold text-orange-600">Account</p>
        <h2 className="!mt-1 text-4xl font-bold tracking-tight text-slate-900">Settings</h2>
        <p className="!mt-1 text-base text-slate-500">Manage your login and password.</p>
      </div>

      <section className="!mt-6 max-w-xl rounded-3xl border border-slate-200/70 bg-white !p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">Your account</h3>
        <dl className="!mt-4 grid grid-cols-[110px_1fr] gap-y-2 text-sm">
          <dt className="text-slate-500">Name</dt>
          <dd className="font-medium text-slate-900">{user.fullName}</dd>
          <dt className="text-slate-500">Username</dt>
          <dd className="font-medium text-slate-900">{user.username}</dd>
          <dt className="text-slate-500">Role</dt>
          <dd className="font-medium capitalize text-slate-900">{user.role}</dd>
        </dl>
      </section>

      <form onSubmit={submit} className="!mt-6 max-w-xl rounded-3xl border border-slate-200/70 bg-white !p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">Change password</h3>
        <p className="!mt-1 text-sm text-slate-500">
          At least 10 characters with letters and numbers. Changing it logs out your other devices.
        </p>

        <div className="!mt-5 flex flex-col gap-4">
          <div>
            <label className={labelCls}>Current password</label>
            <input type="password" autoComplete="current-password" className={inputCls} value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>New password</label>
            <input type="password" autoComplete="new-password" className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Repeat new password</label>
            <input type="password" autoComplete="new-password" className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
        </div>

        {error && <p className="!mt-4 rounded-xl bg-red-50 !px-4 !py-3 text-sm font-medium text-red-600">{error}</p>}
        {success && (
          <p className="!mt-4 flex items-center gap-2 rounded-xl bg-green-50 !px-4 !py-3 text-sm font-medium text-green-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {success}
          </p>
        )}

        <div className="!mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving || !current || !next || !confirm}
            className="rounded-xl bg-orange-600 !px-6 !py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Change password"}
          </button>
        </div>
      </form>
    </main>
  );
};

export default Settings;