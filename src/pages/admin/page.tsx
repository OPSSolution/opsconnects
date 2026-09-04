import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession } from "@/utils/auth";
import { getOverview, Overview } from "@/utils/admin";
import PartnersTab from "./components/PartnersTab";
import SupportRequestsTab from "./components/SupportRequestsTab";
import LiveChatsTab from "./components/LiveChatsTab";
import AgentsTab from "./components/AgentsTab";

const TABS = [
  { id: "partners", label: "Partners",         icon: "ri-building-line" },
  { id: "support",  label: "Support Requests",  icon: "ri-customer-service-2-line" },
  { id: "live",     label: "Live Chats",        icon: "ri-chat-3-line" },
  { id: "agents",   label: "Agents",            icon: "ri-team-line" },
] as const;
type TabId = typeof TABS[number]["id"];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("partners");
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    getOverview().then(setOverview).catch((e) => console.error("Failed to load overview:", e));
  }, []);

  const handleSignOut = async () => {
    await clearSession();
    navigate("/login", { replace: true });
  };

  const stats = [
    { label: "Partners",         value: overview?.partners ?? "—",       icon: "ri-building-line",             color: "text-primary-500" },
    { label: "Agents",           value: overview?.agents ?? "—",         icon: "ri-team-line",                 color: "text-accent-500" },
    { label: "Open Support",     value: overview?.support_new ?? "—",    icon: "ri-customer-service-2-line",   color: "text-red-500" },
    { label: "Live Chats Now",   value: (overview ? overview.chats_waiting + overview.chats_active : "—"),    icon: "ri-chat-3-line", color: "text-secondary-500" },
    { label: "Total Messages",   value: overview?.messages_total ?? "—", icon: "ri-mail-send-line",            color: "text-green-500" },
  ];

  return (
    <div className="min-h-screen bg-background-50">
      {/* Top nav */}
      <header className="sticky top-0 z-30 bg-background-100 border-b border-background-200/70 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-heading text-lg font-bold text-foreground-950">
            OPS<span className="text-primary-500">Connect</span>
          </span>
          <span className="text-xs bg-accent-100 text-accent-600 font-semibold px-2 py-0.5 rounded-full border border-accent-200">
            Admin Panel
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-xs font-medium text-foreground-500 hover:text-foreground-800 transition-colors cursor-pointer"
        >
          <i className="ri-logout-box-line"></i> Sign out
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-background-100 border border-background-200/70 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <i className={`${stat.icon} text-sm ${stat.color}`}></i>
                <span className="text-xs text-foreground-500">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground-950">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-background-100 border border-background-200/70 rounded-lg p-1 mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer px-3.5 py-2 rounded-md transition-colors ${
                tab === t.id ? "bg-primary-500 text-background-50 dark:text-foreground-950" : "text-foreground-600 hover:bg-background-200/50"
              }`}
            >
              <i className={t.icon}></i> {t.label}
            </button>
          ))}
        </div>

        {tab === "partners" && <PartnersTab />}
        {tab === "support"  && <SupportRequestsTab />}
        {tab === "live"     && <LiveChatsTab />}
        {tab === "agents"   && <AgentsTab />}
      </main>
    </div>
  );
}
