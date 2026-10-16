import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, UserPlus } from "lucide-react";
import { api } from "../services/api";
import CustomerModal from "../components/gst/CustomerModal";
import { STATES, GST_RATES, stateName, validateGstin, calcInvoice, inr, amountInWords } from "../utils/gstCalc";

/*
  Make a new tax invoice. The totals shown here are only a preview while you type;
  the server does the final maths when you save.
  Spacing classes use the "!" prefix so they work with a global CSS reset.
*/

const todayStr = () => new Date().toLocaleDateString("en-CA");

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white !px-3 !py-2.5 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20";
const labelCls = "!mb-1.5 block text-sm font-medium text-slate-700";
const cardCls = "!mt-5 rounded-3xl border border-slate-200/70 bg-white !p-6 shadow-sm";

const isFilled = (it) => it.description.trim() || it.qty !== "" || it.rate !== "";
const isCountable = (it) => Number(it.qty) > 0 && Number(it.rate) > 0;

const InvoiceForm = () => {
  const navigate = useNavigate();
  const keyRef = useRef(1);
  const blankRow = (gstRate) => ({ key: keyRef.current++, description: "", hsn: "", qty: "", unit: "Pcs", rate: "", gstRate });

  const [settings, setSettings] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loadError, setLoadError] = useState("");

  const [date, setDate] = useState(todayStr());
  const [nextNo, setNextNo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("27");
  const [reverseCharge, setReverseCharge] = useState("N");
  const [shipDifferent, setShipDifferent] = useState(false);
  const [ship, setShip] = useState({ name: "", address: "", gstin: "", stateCode: "27" });
  const [transport, setTransport] = useState({ transport: "", vehicleNo: "", grRrNo: "", station: "" });
  const [items, setItems] = useState([]);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.getGstSettings(), api.getCustomers()])
      .then(([s, c]) => {
        setSettings(s);
        setCustomers(c);
        setPlaceOfSupply(s.stateCode);
        setItems([blankRow(s.defaultGstRate)]);
      })
      .catch((e) => setLoadError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The number this invoice will get (just a preview)
  useEffect(() => {
    if (!date) return;
    api.nextInvoiceNo(date).then((r) => setNextNo(r.invoiceNo)).catch(() => setNextNo(""));
  }, [date]);

  const customer = customers.find((c) => String(c.id) === String(customerId));
  const interstate = Boolean(settings) && placeOfSupply !== settings.stateCode;

  const chooseCustomer = (id) => {
    setCustomerId(id);
    const c = customers.find((x) => String(x.id) === String(id));
    if (c) setPlaceOfSupply(c.stateCode);
  };

  const updateItem = (key, field, value) => setItems((list) => list.map((it) => (it.key === key ? { ...it, [field]: value } : it)));
  const removeItem = (key) => setItems((list) => (list.length > 1 ? list.filter((it) => it.key !== key) : list));

  const calc = useMemo(
    () => calcInvoice(items.filter(isCountable).map((it) => ({ qty: it.qty, rate: it.rate, gstRate: Number(it.gstRate) })), interstate),
    [items, interstate]
  );
  const rowAmount = (it) => (isCountable(it) ? calcInvoice([{ qty: it.qty, rate: it.rate, gstRate: 0 }], false).lines[0].amountPaise / 100 : 0);

  const submit = async () => {
    setError("");
    if (!customerId) return setError("Choose a customer.");
    const rows = items.filter(isFilled);
    if (!rows.length) return setError("Add at least one item.");
    for (let i = 0; i < rows.length; i++) {
      const it = rows[i];
      if (!it.description.trim()) return setError(`Item ${i + 1}: enter a description.`);
      if (!(Number(it.qty) > 0)) return setError(`Item ${i + 1}: enter a quantity.`);
      if (!(Number(it.rate) > 0)) return setError(`Item ${i + 1}: enter a rate.`);
    }
    if (shipDifferent) {
      if (!ship.name.trim() || !ship.address.trim()) return setError("Enter the ship-to name and address.");
      if (ship.gstin.trim()) {
        const problem = validateGstin(ship.gstin);
        if (problem) return setError(`Ship-to: ${problem}`);
        if (ship.gstin.trim().slice(0, 2) !== ship.stateCode) return setError("Ship-to: the GSTIN does not belong to the state you selected.");
      }
    }

    setSaving(true);
    try {
      const inv = await api.createInvoice({
        date,
        customerId: Number(customerId),
        placeOfSupply,
        reverseCharge,
        ship: { different: shipDifferent, ...ship, gstin: ship.gstin.trim().toUpperCase() },
        ...transport,
        items: rows.map((it) => ({
          description: it.description,
          hsn: it.hsn,
          qty: Number(it.qty),
          unit: it.unit,
          rate: Number(it.rate),
          gstRate: Number(it.gstRate),
        })),
      });
      navigate(`/invoice/${inv.id}`);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <main className="min-h-full flex-1 bg-slate-50 !p-8">
        <p className="text-sm font-medium text-red-600">{loadError}</p>
        <button type="button" onClick={() => navigate("/gst-billing")} className="!mt-4 rounded-xl border border-slate-200 bg-white !px-4 !py-2 text-sm font-medium text-slate-700">
          Back to GST Billing
        </button>
      </main>
    );
  }
  if (!settings) return <p className="!p-8 text-sm text-slate-500">Loading…</p>;

  return (
    <main className="min-h-full flex-1 bg-slate-50 !p-8">
      <button type="button" onClick={() => navigate("/gst-billing")} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to GST Billing
      </button>
      <div className="!mt-3">
        <p className="text-sm font-semibold text-orange-600">New invoice</p>
        <h2 className="!mt-1 text-4xl font-bold tracking-tight text-slate-900">Tax Invoice</h2>
      </div>

      {/* Invoice details */}
      <section className={cardCls}>
        <h3 className="text-lg font-semibold text-slate-900">Invoice details</h3>
        <div className="!mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className={labelCls}>Invoice date *</label>
            <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Invoice number</label>
            <input className={`${inputCls} bg-slate-50 text-slate-600`} value={nextNo || "-"} readOnly />
            <p className="!mt-1 text-xs text-slate-400">Given automatically when you save.</p>
          </div>
          <div>
            <label className={labelCls}>Place of supply *</label>
            <select className={inputCls} value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)}>
              {STATES.map(([code, name]) => (
                <option key={code} value={code}>
                  {name} ({code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Reverse charge</label>
            <select className={inputCls} value={reverseCharge} onChange={(e) => setReverseCharge(e.target.value)}>
              <option value="N">No</option>
              <option value="Y">Yes</option>
            </select>
          </div>
        </div>
      </section>

      {/* Customer */}
      <section className={cardCls}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">Billed to</h3>
          <button
            type="button"
            onClick={() => setAddingCustomer(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 !px-3.5 !py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <UserPlus className="h-4 w-4" /> Add new customer
          </button>
        </div>
        <div className="!mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className={labelCls}>Customer *</label>
            <select className={inputCls} value={customerId} onChange={(e) => chooseCustomer(e.target.value)}>
              <option value="">Choose a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {customer && (
            <div className="rounded-xl bg-slate-50 !p-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">{customer.name}</p>
              <p>{customer.address}</p>
              <p className="!mt-1">
                GSTIN: {customer.gstin || "Unregistered"} · State: {stateName(customer.stateCode)}
              </p>
            </div>
          )}
        </div>

        <label className="!mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={shipDifferent} onChange={(e) => setShipDifferent(e.target.checked)} className="h-4 w-4 accent-orange-600" />
          Ship to a different address
        </label>
        {shipDifferent && (
          <div className="!mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Ship-to name *</label>
              <input className={inputCls} value={ship.name} onChange={(e) => setShip({ ...ship, name: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Ship-to GSTIN</label>
              <input className={`${inputCls} uppercase`} maxLength={15} value={ship.gstin} onChange={(e) => setShip({ ...ship, gstin: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Ship-to address *</label>
              <textarea rows={2} className={inputCls} value={ship.address} onChange={(e) => setShip({ ...ship, address: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Ship-to state *</label>
              <select className={inputCls} value={ship.stateCode} onChange={(e) => setShip({ ...ship, stateCode: e.target.value })}>
                {STATES.map(([code, name]) => (
                  <option key={code} value={code}>
                    {code} - {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>

      {/* Transport */}
      <section className={cardCls}>
        <h3 className="text-lg font-semibold text-slate-900">Transport (optional)</h3>
        <div className="!mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["transport", "Transport", "e.g. By hand"],
            ["vehicleNo", "Vehicle number", "MH 09 AB 1234"],
            ["grRrNo", "GR/RR number", ""],
            ["station", "Station", ""],
          ].map(([k, label, ph]) => (
            <div key={k}>
              <label className={labelCls}>{label}</label>
              <input className={inputCls} value={transport[k]} placeholder={ph} onChange={(e) => setTransport({ ...transport, [k]: e.target.value })} />
            </div>
          ))}
        </div>
      </section>

      {/* Items */}
      <section className={cardCls}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">Items</h3>
          <p className="text-xs text-slate-500">
            Tax: {interstate ? "IGST (customer is in another state)" : "CGST + SGST (same state)"}
          </p>
        </div>

        <div className="!mt-4 hidden grid-cols-12 gap-2 text-xs font-semibold text-slate-500 md:grid">
          <span className="col-span-3">Description *</span>
          <span className="col-span-2">HSN / SAC</span>
          <span className="col-span-1">Qty *</span>
          <span className="col-span-1">Unit</span>
          <span className="col-span-2">Rate (₹) *</span>
          <span className="col-span-1">GST %</span>
          <span className="col-span-2 text-right">Amount (₹)</span>
        </div>

        <div className="!mt-2 flex flex-col gap-3">
          {items.map((it) => (
            <div key={it.key} className="grid grid-cols-12 gap-2 rounded-2xl border border-slate-100 !p-2 md:border-0 md:!p-0">
              <input className={`${inputCls} col-span-12 md:col-span-3`} placeholder="Description of goods / service" value={it.description} onChange={(e) => updateItem(it.key, "description", e.target.value)} />
              <input className={`${inputCls} col-span-6 md:col-span-2`} placeholder="HSN / SAC" inputMode="numeric" maxLength={8} value={it.hsn} onChange={(e) => updateItem(it.key, "hsn", e.target.value)} />
              <input className={`${inputCls} col-span-3 md:col-span-1`} placeholder="Qty" type="number" min="0" step="any" value={it.qty} onChange={(e) => updateItem(it.key, "qty", e.target.value)} />
              <input className={`${inputCls} col-span-3 md:col-span-1`} placeholder="Unit" list="unit-list" value={it.unit} onChange={(e) => updateItem(it.key, "unit", e.target.value)} />
              <input className={`${inputCls} col-span-5 md:col-span-2`} placeholder="Rate" type="number" min="0" step="0.01" value={it.rate} onChange={(e) => updateItem(it.key, "rate", e.target.value)} />
              <select className={`${inputCls} col-span-3 md:col-span-1`} value={it.gstRate} onChange={(e) => updateItem(it.key, "gstRate", Number(e.target.value))}>
                {GST_RATES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <div className="col-span-4 flex items-center justify-end gap-1 md:col-span-2">
                <span className="text-sm font-semibold text-slate-800">{inr(rowAmount(it))}</span>
                <button type="button" onClick={() => removeItem(it.key)} disabled={items.length === 1} aria-label="Remove item" className="rounded-lg !p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-30">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <datalist id="unit-list">
          {["Pcs", "Nos", "Kg", "Mtr", "Set", "Ltr", "Box", "Hrs"].map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>

        <button
          type="button"
          onClick={() => setItems((list) => (list.length >= 30 ? list : [...list, blankRow(settings.defaultGstRate)]))}
          className="!mt-4 flex items-center gap-2 rounded-xl border border-dashed border-slate-300 !px-4 !py-2.5 text-sm font-medium text-slate-600 hover:border-orange-400 hover:bg-orange-50/40"
        >
          <Plus className="h-4 w-4" /> Add item
        </button>

        {/* Totals */}
        <div className="!mt-6 flex justify-end">
          <div className="w-full max-w-sm rounded-2xl bg-slate-50 !p-4 text-sm">
            <div className="flex justify-between !py-1 text-slate-700">
              <span>Taxable value</span>
              <span>₹{inr(calc.taxablePaise / 100)}</span>
            </div>
            {calc.groups.flatMap((g) =>
              interstate
                ? [["IGST", g.igstPaise]].map(([name, p]) => (
                    <div key={`${name}${g.rate}`} className="flex justify-between !py-1 text-slate-700">
                      <span>
                        {name} @ {g.rate}%
                      </span>
                      <span>₹{inr(p / 100)}</span>
                    </div>
                  ))
                : [["CGST", g.cgstPaise], ["SGST", g.sgstPaise]].map(([name, p]) => (
                    <div key={`${name}${g.rate}`} className="flex justify-between !py-1 text-slate-700">
                      <span>
                        {name} @ {g.rate / 2}%
                      </span>
                      <span>₹{inr(p / 100)}</span>
                    </div>
                  ))
            )}
            {calc.roundOffPaise !== 0 && (
              <div className="flex justify-between !py-1 text-slate-500">
                <span>Round off</span>
                <span>{inr(calc.roundOffPaise / 100)}</span>
              </div>
            )}
            <div className="!mt-2 flex justify-between border-t border-slate-200 !pt-3 text-base font-bold text-slate-900">
              <span>Grand total</span>
              <span>₹{inr(calc.grandPaise / 100)}</span>
            </div>
            {calc.grandPaise > 0 && <p className="!mt-2 text-xs text-slate-500">{amountInWords(calc.grandPaise)}</p>}
          </div>
        </div>
      </section>

      {error && <p className="!mt-5 rounded-xl bg-red-50 !px-4 !py-3 text-sm font-medium text-red-600">{error}</p>}

      <div className="!mt-5 flex justify-end gap-3">
        <button type="button" onClick={() => navigate("/gst-billing")} className="rounded-xl border border-slate-200 bg-white !px-5 !py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="rounded-xl bg-orange-600 !px-6 !py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save invoice"}
        </button>
      </div>

      {addingCustomer && (
        <CustomerModal
          customer={null}
          onClose={() => setAddingCustomer(false)}
          onSaved={(c) => {
            setCustomers((list) => [...list, c].sort((a, b) => a.name.localeCompare(b.name)));
            chooseCustomer(c.id);
            setCustomerId(String(c.id));
            setPlaceOfSupply(c.stateCode);
            setAddingCustomer(false);
          }}
        />
      )}
    </main>
  );
};

export default InvoiceForm;