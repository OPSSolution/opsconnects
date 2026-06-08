import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";
import { apiUsageStats, teamMembers as defaultTeamMembers } from "@/mocks/dashboard";
import { partnerChannels } from "@/mocks/partners";

type TeamMember = { id: string; name: string; email: string; role: string; avatarColor: string };

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const roles = ["Admin", "Agent", "Viewer"];
const avatarPalette = ["#E4405F", "#26A5E4", "#25D366", "#FF6B35", "#0084FF", "#07C160", "#00C300", "#EA4335"];

export default function PartnerProfile() {
  const [partnerName, setPartnerName] = useState("");
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", email: "", role: "Agent" });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const name = localStorage.getItem("omni_partner_name") || "";
    const id = localStorage.getItem("omni_partner_id");
    setPartnerName(name);
    setPartnerId(id);
    setEditNameValue(name);

    const savedMembers = localStorage.getItem("omni_team_members");
    if (savedMembers) {
      try { setTeamMembers(JSON.parse(savedMembers)); } catch { setTeamMembers(defaultTeamMembers); }
    } else {
      setTeamMembers(defaultTeamMembers);
    }
  }, []);

  const showToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 2500); };

  const handleSaveName = () => {
    const trimmed = editNameValue.trim();
    if (!trimmed || trimmed.length < 2) { showToast("Name must be at least 2 characters."); return; }
    localStorage.setItem("omni_partner_name", trimmed);
    setPartnerName(trimmed);
    setIsEditingName(false);
    showToast("Partner name updated!");
  };

  const handleAddMember = () => {
    if (!newMember.name.trim() || !newMember.email.trim()) { showToast("Please fill in name and email."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newMember.email.trim())) { showToast("Please enter a valid email address."); return; }
    const member: TeamMember = {
      id: `tm-${Date.now()}`,
      name: newMember.name.trim(),
      email: newMember.email.trim(),
      role: newMember.role,
      avatarColor: avatarPalette[Math.floor(Math.random() * avatarPalette.length)],
    };
    const updated = [...teamMembers, member];
    setTeamMembers(updated);
    localStorage.setItem("omni_team_members", JSON.stringify(updated));
    setNewMember({ name: "", email: "", role: "Agent" });
    setShowAddMember(false);
    showToast(`${member.name} added to the team!`);
  };

  const handleRemoveMember = (id: string) => {
    const updated = teamMembers.filter((m) => m.id !== id);
    setTeamMembers(updated);
    localStorage.setItem("omni_team_members", JSON.stringify(updated));
    setDeleteConfirm(null);
    showToast("Team member removed.");
  };

  const handleRoleChange = (id: string, role: string) => {
    const updated = teamMembers.map((m) => m.id === id ? { ...m, role } : m);
    setTeamMembers(updated);
    localStorage.setItem("omni_team_members", JSON.stringify(updated));
    showToast("Role updated.");
  };

  const connectedCount = (() => {
    let count = 0;
    if (localStorage.getItem("omni_wa_configured") === "true") count++;
    if (localStorage.getItem("omni_ig_configured") === "true") count++;
    if (localStorage.getItem("omni_line_configured") === "true") count++;
    if (localStorage.getItem("omni_email_configured") === "true") count++;
    if (localStorage.getItem("omni_lc_configured") === "true") count++;
    if (localStorage.getItem("omni_wc_configured") === "true") count++;
    const sc = localStorage.getItem("omni_completed_setups");
    if (sc) { try { const c = JSON.parse(sc); Object.values(c).forEach((v) => { if (v) count++; }); } catch { /* */ } }
    return count;
  })();

  return (
    <>
      <Navbar />
      <main className="pt-20 md:pt-24 min-h-screen bg-background-50">
        <div className="px-4 md:px-6 py-8 md:py-12">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
              <div>
                <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground-950">Partner Profile</h1>
                <p className="text-sm text-foreground-500 mt-1">Manage your partner account, team, and API access</p>
              </div>
              <Link
                to="/dashboard"
                className="text-sm font-semibold bg-primary-500 text-background-50 dark:text-foreground-950 hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer px-5 py-2.5 rounded-md inline-flex items-center gap-1.5"
              >
                <i className="ri-dashboard-line"></i> Dashboard
              </Link>
            </div>

            {/* Partner Info Card */}
            <div className="bg-background-100 rounded-xl border border-background-200/70 p-6 md:p-8 mb-6">
              <h2 className="font-heading text-lg font-bold text-foreground-950 mb-5">Partner Information</h2>

              {!partnerId ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-200/80 mb-4">
                    <i className="ri-user-add-line text-xl text-foreground-400"></i>
                  </div>
                  <p className="text-sm font-semibold text-foreground-700">Not registered as a partner yet</p>
                  <p className="text-xs text-foreground-500 mt-1 mb-4">Register to get your Partner ID and unlock all features.</p>
                  <Link to="/partners" className="text-sm font-medium bg-primary-500 text-background-50 dark:text-foreground-950 hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer px-5 py-2.5 rounded-md inline-block">
                    Register Now
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Partner Name */}
                  <div className="bg-background-50 rounded-lg border border-background-200/70 p-5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-foreground-400 mb-2 block">Partner Name</label>
                    {isEditingName ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); }}
                          className="flex-1 text-sm bg-background-100 border border-background-200/70 rounded-md px-3 py-2 outline-none focus:border-primary-400 text-foreground-800"
                          autoFocus
                        />
                        <button onClick={handleSaveName} className="text-xs font-semibold bg-primary-500 text-background-50 dark:text-foreground-950 hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer px-3 py-2 rounded-md">
                          Save
                        </button>
                        <button onClick={() => { setIsEditingName(false); setEditNameValue(partnerName); }} className="text-xs font-medium text-foreground-500 hover:text-foreground-700 transition-colors whitespace-nowrap cursor-pointer px-3 py-2 rounded-md">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground-900">{partnerName}</p>
                        <button onClick={() => setIsEditingName(true)} className="text-xs font-medium text-foreground-500 hover:text-primary-500 transition-colors whitespace-nowrap cursor-pointer">
                          <i className="ri-edit-line"></i> Edit
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Partner ID */}
                  <div className="bg-background-50 rounded-lg border border-accent-200/60 p-5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-foreground-400 mb-2 block">Partner ID</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs font-mono bg-background-100 border border-background-200/70 rounded-md px-3 py-2 text-foreground-700 select-all">{partnerId}</code>
                      <button onClick={() => { navigator.clipboard.writeText(partnerId); showToast("Partner ID copied!"); }} className="w-9 h-9 flex items-center justify-center rounded-md cursor-pointer text-foreground-500 hover:text-primary-500 hover:bg-primary-50 transition-colors flex-shrink-0">
                        <i className="ri-file-copy-line text-sm"></i>
                      </button>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="bg-background-50 rounded-lg border border-background-200/70 p-5 flex items-center gap-4">
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-100 flex-shrink-0">
                      <i className="ri-link text-lg text-primary-600"></i>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground-950">{connectedCount}</p>
                      <p className="text-xs text-foreground-500">Connected Channels</p>
                    </div>
                  </div>

                  <div className="bg-background-50 rounded-lg border border-background-200/70 p-5 flex items-center gap-4">
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-accent-100 flex-shrink-0">
                      <i className="ri-team-line text-lg text-accent-600"></i>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground-950">{teamMembers.length}</p>
                      <p className="text-xs text-foreground-500">Team Members</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* API Usage Stats */}
            {partnerId && (
              <div className="bg-background-100 rounded-xl border border-background-200/70 p-6 md:p-8 mb-6">
                <h2 className="font-heading text-lg font-bold text-foreground-950 mb-5">API Usage</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-background-50 rounded-lg border border-background-200/70 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-400 mb-1">Total Requests</p>
                    <p className="text-lg font-bold text-foreground-950">{apiUsageStats.totalRequests.toLocaleString()}</p>
                  </div>
                  <div className="bg-background-50 rounded-lg border border-background-200/70 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-400 mb-1">This Month</p>
                    <p className="text-lg font-bold text-foreground-950">{apiUsageStats.requestsThisMonth.toLocaleString()}</p>
                  </div>
                  <div className="bg-background-50 rounded-lg border border-background-200/70 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-400 mb-1">Rate Limit</p>
                    <p className="text-lg font-bold text-foreground-950">{apiUsageStats.rateLimit}</p>
                  </div>
                  <div className="bg-background-50 rounded-lg border border-background-200/70 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-400 mb-1">Avg Latency</p>
                    <p className="text-lg font-bold text-foreground-950">{apiUsageStats.avgLatency}</p>
                  </div>
                </div>

                <div className="bg-background-50 rounded-lg border border-background-200/70 p-5">
                  <p className="text-xs font-semibold text-foreground-700 mb-3">Endpoint Breakdown</p>
                  <div className="space-y-3">
                    {apiUsageStats.endpoints.map((ep) => (
                      <div key={ep.path}>
                        <div className="flex items-center justify-between mb-1">
                          <code className="text-xs font-mono text-foreground-700">{ep.path}</code>
                          <span className="text-xs text-foreground-500">{ep.calls.toLocaleString()} calls ({ep.pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-background-200 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${ep.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-background-200/50">
                    <span className="text-xs text-foreground-400">Last API call: {apiUsageStats.lastUsed}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Team Management */}
            {partnerId && (
              <div className="bg-background-100 rounded-xl border border-background-200/70 p-6 md:p-8 mb-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-heading text-lg font-bold text-foreground-950">Team Members ({teamMembers.length})</h2>
                  <button
                    onClick={() => setShowAddMember(!showAddMember)}
                    className="text-xs font-semibold bg-primary-500 text-background-50 dark:text-foreground-950 hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer px-4 py-2 rounded-md inline-flex items-center gap-1.5"
                  >
                    <i className="ri-add-line"></i> Add Member
                  </button>
                </div>

                {/* Add Member Form */}
                {showAddMember && (
                  <div className="bg-background-50 rounded-lg border border-primary-200/60 p-5 mb-5 animate-[fadeInUp_0.3s_ease-out]">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-foreground-600 mb-1">Name</label>
                        <input
                          type="text"
                          value={newMember.name}
                          onChange={(e) => setNewMember((p) => ({ ...p, name: e.target.value }))}
                          placeholder="e.g. Jane Smith"
                          className="w-full bg-background-100 border border-background-200/70 rounded-md px-3 py-2 text-sm text-foreground-800 outline-none focus:border-primary-400 placeholder:text-foreground-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-foreground-600 mb-1">Email</label>
                        <input
                          type="email"
                          value={newMember.email}
                          onChange={(e) => setNewMember((p) => ({ ...p, email: e.target.value }))}
                          placeholder="e.g. jane@company.com"
                          className="w-full bg-background-100 border border-background-200/70 rounded-md px-3 py-2 text-sm text-foreground-800 outline-none focus:border-primary-400 placeholder:text-foreground-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-foreground-600 mb-1">Role</label>
                        <select
                          value={newMember.role}
                          onChange={(e) => setNewMember((p) => ({ ...p, role: e.target.value }))}
                          className="w-full appearance-none bg-background-100 border border-background-200/70 rounded-md px-3 py-2 text-sm text-foreground-800 outline-none focus:border-primary-400 cursor-pointer"
                        >
                          {roles.map((r) => (<option key={r} value={r}>{r}</option>))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setShowAddMember(false)} className="text-xs font-medium text-foreground-500 hover:text-foreground-700 transition-colors whitespace-nowrap cursor-pointer px-3 py-1.5 rounded-md">
                        Cancel
                      </button>
                      <button onClick={handleAddMember} className="text-xs font-semibold bg-primary-500 text-background-50 dark:text-foreground-950 hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer px-4 py-1.5 rounded-md">
                        Add to Team
                      </button>
                    </div>
                  </div>
                )}

                {/* Members List */}
                <div className="space-y-2">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="bg-background-50 rounded-lg border border-background-200/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0 text-xs font-bold text-white" style={{ backgroundColor: member.avatarColor }}>
                          {getInitials(member.name)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground-900">{member.name}</p>
                          <p className="text-xs text-foreground-400">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-12 sm:ml-0">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className="appearance-none bg-background-100 border border-background-200/70 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground-700 outline-none cursor-pointer focus:border-primary-400"
                        >
                          {roles.map((r) => (<option key={r} value={r}>{r}</option>))}
                        </select>
                        <button
                          onClick={() => setDeleteConfirm(member.id)}
                          className="text-xs font-medium text-foreground-400 hover:text-red-500 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Role Legend */}
                <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-background-200/50">
                  {roles.map((role) => (
                    <div key={role} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-foreground-300" />
                      <span className="text-[11px] text-foreground-500">{role}: {role === "Admin" ? "Full access to all settings" : role === "Agent" ? "Can manage conversations" : "Read-only access"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-background-50 rounded-xl border border-background-200/70 p-6 max-w-sm w-full shadow-lg">
            <div className="text-center mb-4">
              <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-red-50 mb-3">
                <i className="ri-user-unfollow-line text-xl text-red-500"></i>
              </div>
              <h3 className="font-heading text-base font-bold text-foreground-950">Remove Team Member?</h3>
              <p className="text-xs text-foreground-500 mt-1">{teamMembers.find((m) => m.id === deleteConfirm)?.name} will lose access to the partner dashboard.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 text-sm font-medium text-foreground-600 hover:text-foreground-800 transition-colors whitespace-nowrap cursor-pointer px-4 py-2.5 rounded-md border border-background-200/70">
                Cancel
              </button>
              <button onClick={() => handleRemoveMember(deleteConfirm)} className="flex-1 text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors whitespace-nowrap cursor-pointer px-4 py-2.5 rounded-md">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-[fadeInUp_0.3s_ease-out]">
          <div className="flex items-center gap-2.5 bg-foreground-950 text-background-50 text-sm px-5 py-3 rounded-lg shadow-lg">
            <i className="ri-checkbox-circle-line text-accent-400"></i>
            {toastMessage}
          </div>
        </div>
      )}
    </>
  );
}