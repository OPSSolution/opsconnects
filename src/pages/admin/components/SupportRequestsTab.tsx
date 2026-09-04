import { useState, useEffect, useCallback } from "react";
import { getSupportRequests, updateSupportRequest, SupportRequestRow } from "@/utils/admin";
import { downloadCSV, fmtDateTime } from "@/utils/csv";

const STATUSES = ["all", "new", "read", "resolved"] as const;
type StatusFilter = typeof STATUSES[number];

const STATUS_CLS: Record<string, string> = {
  new:      "bg-red-100 text-red-600",
  read:     "bg-blue-100 text-blue-600",
  resolved: "bg-green-100 text-green-600",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function SupportRequestsTab() {
  const [requests, setRequests] = useState<SupportRequestRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch]     = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRequests(await getSupportRequests()); }
    catch (e) { console.error("Failed to load support requests:", e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: "read" | "resolved") => {
    setUpdating(id);
    try {
      await updateSupportRequest(id, status);
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    } catch (e) { console.error("Failed to update status:", e); }
    setUpdating(null);
  };

  const filtered = requests.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (dateFrom && new Date(r.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(r.created_at) > new Date(dateTo + "T23:59:59.999")) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return r.visitor_name.toLowerCase().includes(q)
      || r.visitor_contact.toLowerCase().includes(q)
      || (r.company ?? "").toLowerCase().includes(q)
      || r.message.toLowerCase().includes(q)
      || (r.partner_name ?? "").toLowerCase().includes(q);
  });

  const exportCSV = () => {
    downloadCSV(
      `support-requests-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Date/Time", "Business", "Visitor Name", "Contact", "Company", "Topic", "Message", "Status", "Resolved At"],
      filtered.map((r) => [fmtDateTime(r.created_at), r.partner_name, r.visitor_name, r.visitor_contact, r.company, r.topic, r.message, r.status, fmtDateTime(r.resolved_at)])
    );
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <div className="flex gap-1 bg-background-100 border border-background-200/70 rounded-lg p-0.5">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`text-xs font-semibold whitespace-nowrap cursor-pointer px-3 py-1.5 rounded-md transition-colors capitalize ${statusFilter === s ? "bg-primary-500 text-background-50 dark:text-foreground-950" : "text-foreground-600 hover:bg-background-100"}`}>
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-xs"></i>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, contact, business…"
            className="w-full bg-background-100 border border-background-200/70 rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground-800 outline-none focus:border-primary-400 placeholder:text-foreground-300"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="text-xs bg-background-100 border border-background-200/70 rounded-lg px-2 py-1.5 text-foreground-700 outline-none focus:border-primary-400" />
          <span className="text-xs text-foreground-400">to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="text-xs bg-background-100 border border-background-200/70 rounded-lg px-2 py-1.5 text-foreground-700 outline-none focus:border-primary-400" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-foreground-400 hover:text-foreground-600 cursor-pointer text-xs">
              <i className="ri-close-line" />
            </button>
          )}
        </div>
        <button onClick={exportCSV} disabled={!filtered.length}
          className="text-xs font-medium bg-background-100 border border-background-200/70 text-foreground-600 hover:text-foreground-900 hover:bg-background-200/50 transition-colors whitespace-nowrap cursor-pointer px-3 py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
          <i className="ri-download-2-line" /> Export CSV
        </button>
        <span className="text-xs text-foreground-400 ml-auto">{loading ? "Loading…" : `${filtered.length} of ${requests.length}`}</span>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <span className="w-6 h-6 border-2 border-primary-400 border-t-primary-600 rounded-full animate-spin inline-block" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-foreground-400">
          <i className="ri-customer-service-2-line text-4xl mb-2 block"></i>
          No support requests match.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <div key={req.id} className="bg-background-100 rounded-xl border border-background-200/70 px-4 py-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground-900">{req.visitor_name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_CLS[req.status]}`}>{req.status}</span>
                    {req.partner_name && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-600">{req.partner_name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-foreground-500 flex items-center gap-1">
                      <i className="ri-mail-line text-[10px]" />{req.visitor_contact}
                    </span>
                    {req.company && (
                      <span className="text-xs text-foreground-400 flex items-center gap-1">
                        <i className="ri-building-line text-[10px]" />{req.company}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-foreground-400">{fmtDate(req.created_at)}</span>
                  {req.status === "new" && (
                    <button onClick={() => updateStatus(req.id, "read")} disabled={updating === req.id}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-40">
                      Mark Read
                    </button>
                  )}
                  {req.status !== "resolved" && (
                    <button onClick={() => updateStatus(req.id, "resolved")} disabled={updating === req.id}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-green-50 text-green-600 hover:bg-green-100 transition-colors cursor-pointer disabled:opacity-40">
                      {updating === req.id ? "…" : "Resolve"}
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3 bg-background-50 rounded-lg px-3 py-2.5">
                <p className="text-xs text-foreground-700 leading-relaxed">{req.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
