import { useState, useEffect, useCallback } from "react";
import { getAgents, AgentRow } from "@/utils/admin";

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return iso; }
}

export default function AgentsTab() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try { setAgents(await getAgents()); }
    catch (e) { console.error("Failed to load agents:", e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = agents.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || (a.partner_name ?? "").toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4">
        <span className="text-xs text-foreground-400">{loading ? "Loading…" : `${filtered.length} of ${agents.length} agents`}</span>
        <div className="relative max-w-xs w-full">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or business…"
            className="w-full bg-background-100 border border-background-200/70 rounded-lg pl-9 pr-4 py-2 text-xs text-foreground-800 outline-none focus:border-primary-400 placeholder:text-foreground-300 transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <span className="w-6 h-6 border-2 border-primary-400 border-t-primary-600 rounded-full animate-spin inline-block" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-foreground-400">
          <i className="ri-team-line text-4xl mb-2 block"></i>
          No agents match.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <div key={a.id} className="bg-background-100 border border-background-200/70 rounded-xl px-4 py-3 flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                style={{ backgroundColor: a.avatar_color || "#6366f1" }}
              >
                {a.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground-900">{a.name}</p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-background-200 text-foreground-600 capitalize">{a.role}</span>
                </div>
                <p className="text-xs text-foreground-400 truncate">{a.email}</p>
              </div>
              {a.partner_name && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-600 flex-shrink-0">{a.partner_name}</span>
              )}
              <span className="text-xs text-foreground-400 flex-shrink-0 hidden sm:block">{formatDate(a.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
