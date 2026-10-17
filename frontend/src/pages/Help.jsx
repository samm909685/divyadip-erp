import { useEffect, useMemo, useState } from "react";
import { Phone, Copy, Check, ChevronDown, Search, RefreshCw } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

/*
  Help & Support. Everything on this page is plain text you can edit below.
  Spacing classes use the "!" prefix so they work with a global CSS reset.
*/

// ----- Change these when needed -----
const APP_VERSION = "1.0.0"; // raise this every time you update the software at the shop
const SUPPORT = {
  name: "Sayam Oswal",
  phone: "9096856444",
  hours: "", // e.g. "Mon to Sat, 10 am to 6 pm". Left empty, so it is not shown.
};

const GUIDES = [
  {
    title: "Add a job and mark work as done",
    steps: [
      "Open Stock Details and click Add job.",
      "Fill in the job name, company, quantity and the other details, then click Add job.",
      "The job appears under Unprocessed. When some or all of the work is finished, click Mark done on that job.",
      "Enter how many pieces are finished and the date, then Save. A job that is part done shows in both the Unprocessed and Completed tabs.",
      "To fix a wrong entry, click the job. You can edit or delete each completed entry there.",
    ],
  },
  {
    title: "Upload a challan photo",
    steps: [
      "Open Challan and click Add challan.",
      "Choose the photo or PDF of the challan (JPG, PNG, WebP or PDF, up to 10 MB).",
      "Check the date and time, add the challan number and company if you wish, then click Add challan.",
      "Click any challan to see it large. Use the pencil to edit it. Only an administrator can delete a challan.",
    ],
  },
  {
    title: "Make a GST invoice",
    steps: [
      "Open GST Billing and click New invoice.",
      "Choose the customer. If the customer is not in the list, click Add new customer.",
      "Add each item with its HSN/SAC code, quantity, rate and GST %. The tax and total are worked out for you.",
      "Click Save invoice. The invoice number is given automatically.",
      "Click Print. To keep a PDF copy, choose Save as PDF in the print window.",
    ],
  },
  {
    title: "Cancel a GST invoice made by mistake",
    steps: [
      "Open GST Billing, find the invoice in the list and click the cancel icon (a circle with a line) on that row.",
      "Type the reason and confirm.",
      "A cancelled invoice cannot be edited or brought back, and it is left out of the totals. Make a new invoice with the correct details.",
    ],
  },
  {
    title: "Record a bill received from a supplier",
    steps: [
      "Open GST Billing, then the Received bills tab, and click Add received bill.",
      "Copy the details from the supplier's invoice: supplier name, GSTIN, their invoice number and date.",
      "Enter the taxable amount and the GST rate, then the bill total as printed. A yellow warning means the numbers do not match, so check them.",
      "Attach a photo of the bill if you have one, then click Add bill.",
      "The same supplier invoice number can only be entered once.",
    ],
  },
  {
    title: "Add a purchase and a payment",
    steps: [
      "Open Purchase Details and click Add purchase.",
      "Enter the shop, date, what was bought and the total. If you paid something already, enter it in Paid now.",
      "When you pay more later, click Pay on that bill and enter the amount.",
      "The Shop-wise tab shows how much is still pending for each shop.",
    ],
  },
  {
    title: "Send the monthly record to the CA",
    steps: [
      "Open GST Billing and choose the month.",
      "On Sales invoices and on Received bills, click Export for CA (Excel). The Monthly summary tab has its own export.",
      "The file opens in Excel and can be sent to the CA.",
    ],
  },
  {
    title: "Change my password",
    steps: [
      "Open Settings and find Change password.",
      "Enter your current password and the new one twice. Use at least 10 characters with letters and numbers.",
      "Your other devices are logged out when you change it.",
    ],
  },
];

const FIXES = [
  { problem: "It says “Cannot reach the server”", answer: "The ERP program is not reachable. Check that the server computer is switched on and the Wi-Fi is working. If it still does not open, call support." },
  { problem: "I forgot my password", answer: "Call support. The password is reset from the server computer, and you can then choose a new one in Settings." },
  { problem: "My account is locked", answer: "After 5 wrong passwords an account locks for 15 minutes. Wait, then try again with the right password." },
  { problem: "I was logged out suddenly", answer: "The system logs you out after 30 minutes without any activity, to keep the data safe. Log in again." },
  { problem: "A photo will not upload", answer: "Only JPG, PNG, WebP and PDF files up to 10 MB are accepted. On an iPhone, set the camera to “Most Compatible” or send the photo as a JPG, because the HEIC type is not accepted." },
  { problem: "I made a mistake on a GST invoice", answer: "An issued invoice cannot be edited. Cancel it, then make a new one." },
  { problem: "I cannot see Purchase Details or GST Billing", answer: "These pages are only for administrators, because they hold money records. Ask the administrator, or call support if you need access." },
  { problem: "A received bill shows a yellow warning", answer: "The bill total you typed is different from the taxable amount plus GST. Check the numbers. Freight or other charges that are not in the lines can cause this, and you can still save." },
  { problem: "The last backup is old, or it failed", answer: "Double-click backup-now in the ERP program folder on the server computer to make one straight away. If the second copy did not happen, plug in the USB drive and run it again. If it fails again, call support." },
  { problem: "The page looks blank or stuck", answer: "Press F5 to refresh the page. If it is still wrong, copy the system details below and send them to support." },
];

const GLOSSARY = [
  ["GSTIN", "The 15-character GST registration number of a business. The first two digits show its state."],
  ["HSN / SAC", "A code for the kind of goods (HSN) or service (SAC) on an invoice."],
  ["Taxable value", "The amount of a bill before GST is added."],
  ["CGST and SGST", "Used when the seller and the buyer are in the same state. The GST is split in two equal halves, one for the Centre and one for the state."],
  ["IGST", "Used when the seller and the buyer are in different states. The whole GST is charged as one tax."],
  ["Place of supply", "The state the goods or service is treated as supplied in. It decides whether CGST and SGST or IGST is charged."],
  ["ITC (input tax credit)", "GST paid on purchases that can be set against the GST charged on sales. Your CA decides what can be claimed."],
  ["Reverse charge", "A special case where the buyer pays the tax instead of the seller. Ask your CA if it applies to you."],
];

// Copies text. Works on the shop network too, where the browser blocks the simple method.
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* use the fallback below */
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

const Accordion = ({ items }) => {
  const [open, setOpen] = useState(null);
  return (
    <div>
      {items.map((it, i) => (
        <div key={it.title} className="border-b border-slate-100 last:border-0">
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
            className="flex w-full items-center justify-between gap-4 !px-5 !py-4 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            {it.title}
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open === i ? "rotate-180" : ""}`} />
          </button>
          {open === i && <div className="!px-5 !pb-5 text-sm text-slate-600">{it.body}</div>}
        </div>
      ))}
    </div>
  );
};

const Card = ({ title, subtitle, children }) => (
  <section className="!mt-6 overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
    <div className="border-b border-slate-100 !px-5 !py-4">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {subtitle && <p className="!mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    </div>
    {children}
  </section>
);

const Help = () => {
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState("");
  const [server, setServer] = useState("checking"); // checking | ok | down
  const [checkedAt, setCheckedAt] = useState("");
  const [backup, setBackup] = useState(null); // null = checking

  const checkServer = async () => {
    setServer("checking");
    try {
      const r = await api.health();
      setServer(r.status === "ok" ? "ok" : "down");
    } catch {
      setServer("down");
    }
    setCheckedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    return undefined;
  };

  useEffect(() => {
    if (!isAdmin) return;
    checkServer();
    api.backupStatus().then(setBackup).catch(() => setBackup({ configured: false }));
  }, [isAdmin]);

  // What to say about the last backup, and in what colour
  const backupInfo = (() => {
    if (!backup) return { text: "Checking…", dot: "bg-slate-300" };
    if (!backup.configured) return { text: "No backup has been made yet. Run backup-now on the server computer.", dot: "bg-red-500" };
    const when = backup.lastGoodTime ? new Date(backup.lastGoodTime) : null;
    const whenText = when ? when.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "never";
    const hours = when ? (Date.now() - when.getTime()) / 3600000 : Infinity;
    if (!backup.ok) return { text: `The last backup FAILED. Last good backup: ${whenText}. ${backup.message || ""}`, dot: "bg-red-500" };
    if (hours > 36) return { text: `${whenText}. This is more than a day old, so check the daily backup.`, dot: "bg-red-500" };
    if (backup.secondCopy === "failed") return { text: `${whenText}. Saved on this computer only. The second copy (USB drive) was not made.`, dot: "bg-amber-500" };
    return { text: `${whenText}${backup.secondCopy === "done" ? " (second copy saved)" : ""}`, dot: "bg-green-500" };
  })();

  const flash = (what) => {
    setCopied(what);
    setTimeout(() => setCopied(""), 2000);
  };

  const copyNumber = async () => {
    if (await copyText(SUPPORT.phone)) flash("phone");
    else window.prompt("Copy this number:", SUPPORT.phone);
  };

  const copyDetails = async () => {
    let status = "not reachable";
    try {
      status = (await api.health()).status === "ok" ? "working" : "problem";
    } catch {
      /* stays "not reachable" */
    }
    const text = [
      `Divyadip ERP, version ${APP_VERSION}`,
      `Time: ${new Date().toLocaleString("en-IN")}`,
      `Signed in: ${user.fullName} (${user.role})`,
      `Address: ${window.location.origin}`,
      `Server: ${status}`,
      `Browser: ${navigator.userAgent}`,
    ].join("\n");
    if (await copyText(text)) flash("details");
    else window.prompt("Copy these details and send them to support:", text);
  };

  // Search across all the help text
  const q = query.trim().toLowerCase();
  const guides = useMemo(() => GUIDES.filter((g) => !q || `${g.title} ${g.steps.join(" ")}`.toLowerCase().includes(q)), [q]);
  const fixes = useMemo(() => FIXES.filter((f) => !q || `${f.problem} ${f.answer}`.toLowerCase().includes(q)), [q]);
  const words = useMemo(() => GLOSSARY.filter(([t, m]) => !q || `${t} ${m}`.toLowerCase().includes(q)), [q]);
  const nothing = q && !guides.length && !fixes.length && !words.length;

  return (
    <main className="min-h-full flex-1 bg-slate-50 !p-8">
      <div>
        <p className="text-sm font-semibold text-orange-600">Support</p>
        <h2 className="!mt-1 text-4xl font-bold tracking-tight text-slate-900">Help &amp; Support</h2>
        <p className="!mt-1 text-base text-slate-500">Guides, quick fixes, and how to reach us.</p>
      </div>

      {/* Contact */}
      <section className="!mt-6 rounded-3xl border border-orange-200 bg-orange-50/60 !p-6">
        <p className="text-sm font-semibold text-orange-700">Need help? Call us</p>
        <div className="!mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xl font-bold text-slate-900">{SUPPORT.name}</p>
            <a href={`tel:${SUPPORT.phone}`} className="!mt-1 flex items-center gap-2 text-3xl font-bold tracking-wide text-orange-600">
              <Phone className="h-6 w-6" /> {SUPPORT.phone}
            </a>
            {SUPPORT.hours && <p className="!mt-1 text-sm text-slate-600">{SUPPORT.hours}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={copyNumber}
              className="flex items-center gap-2 rounded-xl border border-orange-200 bg-white !px-4 !py-2.5 text-sm font-medium text-slate-700 hover:bg-orange-50"
            >
              {copied === "phone" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied === "phone" ? "Copied" : "Copy number"}
            </button>
            <button
              type="button"
              onClick={copyDetails}
              className="flex items-center gap-2 rounded-xl bg-orange-600 !px-4 !py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-700"
            >
              {copied === "details" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === "details" ? "Copied" : "Copy system details"}
            </button>
          </div>
        </div>
        <p className="!mt-3 text-sm text-slate-600">
          If something is wrong, press “Copy system details” and send what it copies to support. It tells us which version you have and what the system
          shows, so we can help faster.
        </p>
      </section>

      {/* Search */}
      <div className="relative !mt-6 max-w-xl">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the help (for example: invoice, password, photo)…"
          className="w-full rounded-xl border border-slate-200 bg-white !py-3 !pl-10 !pr-3.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
        />
      </div>

      {nothing && (
        <p className="!mt-6 rounded-xl bg-white !px-5 !py-8 text-center text-sm text-slate-500">
          Nothing found for “{query}”. Try another word, or call {SUPPORT.name} on {SUPPORT.phone}.
        </p>
      )}

      {guides.length > 0 && (
        <Card title="How do I…?" subtitle="Step-by-step guides. Click one to open it.">
          <Accordion
            key={`g-${q}`}
            items={guides.map((g) => ({
              title: g.title,
              body: (
                <ol className="list-decimal !pl-5">
                  {g.steps.map((s) => (
                    <li key={s} className="!mt-1.5">
                      {s}
                    </li>
                  ))}
                </ol>
              ),
            }))}
          />
        </Card>
      )}

      {fixes.length > 0 && (
        <Card title="Something went wrong?" subtitle="The most common problems and what to do.">
          <Accordion key={`f-${q}`} items={fixes.map((f) => ({ title: f.problem, body: <p>{f.answer}</p> }))} />
        </Card>
      )}

      {words.length > 0 && (
        <Card title="GST words in plain language" subtitle="For your own case, always ask your CA.">
          <div className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2">
            {words.map(([term, meaning]) => (
              <div key={term} className="bg-white !p-5">
                <p className="text-sm font-semibold text-slate-900">{term}</p>
                <p className="!mt-1 text-sm text-slate-600">{meaning}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* System status (administrators only) */}
      {isAdmin && !q && (
        <Card title="System status" subtitle="For the administrator.">
          <dl className="grid grid-cols-[150px_1fr] gap-y-3 !p-5 text-sm">
            <dt className="text-slate-500">Software version</dt>
            <dd className="font-medium text-slate-900">{APP_VERSION}</dd>
            <dt className="text-slate-500">Server and database</dt>
            <dd className="flex items-center gap-2 font-medium text-slate-900">
              <span className={`h-2.5 w-2.5 rounded-full ${server === "ok" ? "bg-green-500" : server === "down" ? "bg-red-500" : "bg-slate-300"}`} />
              {server === "ok" ? "Working" : server === "down" ? "Not working" : "Checking…"}
              {checkedAt && <span className="text-xs font-normal text-slate-400">checked at {checkedAt}</span>}
              <button type="button" onClick={checkServer} aria-label="Check again" className="rounded-lg !p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </dd>
            <dt className="text-slate-500">Last backup</dt>
            <dd className="flex items-start gap-2 font-medium text-slate-900">
              <span className={`!mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${backupInfo.dot}`} />
              <span>{backupInfo.text}</span>
            </dd>
            <dt className="text-slate-500">Signed in as</dt>
            <dd className="font-medium text-slate-900">
              {user.fullName} ({user.username}, {user.role})
            </dd>
            <dt className="text-slate-500">Address</dt>
            <dd className="font-medium text-slate-900">{window.location.origin}</dd>
          </dl>
        </Card>
      )}
    </main>
  );
};

export default Help;