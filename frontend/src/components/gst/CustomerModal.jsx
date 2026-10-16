import { useState } from "react";
import { X } from "lucide-react";
import { api } from "../../services/api";
import { STATES, validateGstin } from "../../utils/gstCalc";

/* Add or edit a customer. Spacing classes use the "!" prefix so they work with a global CSS reset. */

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white !px-3.5 !py-2.5 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20";
const labelCls = "!mb-1.5 block text-sm font-medium text-slate-700";

const CustomerModal = ({ customer, onClose, onSaved }) => {
  const isEdit = Boolean(customer);
  const [form, setForm] = useState({
    name: customer?.name ?? "",
    address: customer?.address ?? "",
    stateCode: customer?.stateCode ?? "27",
    gstin: customer?.gstin ?? "",
    phone: customer?.phone ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setError("");
  };

  const submit = async () => {
    if (!form.name.trim()) return setError("Customer name is required.");
    if (!form.address.trim()) return setError("Customer address is required.");
    const gstin = form.gstin.trim().toUpperCase();
    if (gstin) {
      const problem = validateGstin(gstin);
      if (problem) return setError(problem);
      if (gstin.slice(0, 2) !== form.stateCode) return setError("The GSTIN does not belong to the state you selected.");
    }
    setSaving(true);
    try {
      const body = { ...form, gstin };
      const saved = isEdit ? await api.updateCustomer(customer.id, body) : await api.createCustomer(body);
      onSaved(saved);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 !p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white !p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{isEdit ? "Edit customer" : "Add customer"}</h3>
            <p className="!mt-0.5 text-sm text-slate-500">These details are printed in "Billed to" on invoices.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg !p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="!mt-4 flex flex-col gap-4">
          <div>
            <label className={labelCls}>Customer name *</label>
            <input className={inputCls} value={form.name} onChange={set("name")} />
          </div>
          <div>
            <label className={labelCls}>Address *</label>
            <textarea rows={2} className={inputCls} value={form.address} onChange={set("address")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>State *</label>
              <select className={inputCls} value={form.stateCode} onChange={set("stateCode")}>
                {STATES.map(([code, name]) => (
                  <option key={code} value={code}>
                    {code} - {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input className={inputCls} value={form.phone} onChange={set("phone")} />
            </div>
          </div>
          <div>
            <label className={labelCls}>GSTIN (leave empty if unregistered)</label>
            <input
              className={`${inputCls} uppercase`}
              maxLength={15}
              value={form.gstin}
              onChange={set("gstin")}
              placeholder="27ABCDE1234F1Z5"
            />
          </div>
        </div>

        {error && <p className="!mt-3 text-sm font-medium text-red-600">{error}</p>}

        <div className="!mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 !px-4 !py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="rounded-xl bg-orange-600 !px-5 !py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add customer"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerModal;