import { useState, useEffect } from "react";

function generatePartnerId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "PART-";
  for (let i = 0; i < 4; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  id += "-";
  for (let i = 0; i < 4; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  return id;
}

export default function PartnerRegistration() {
  const [partnerName, setPartnerName] = useState("");
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    const savedName = localStorage.getItem("omni_partner_name");
    const savedId = localStorage.getItem("omni_partner_id");
    if (savedName && savedId) {
      setPartnerName(savedName);
      setPartnerId(savedId);
      setIsRegistered(true);
    }
  }, []);

  const handleRegister = () => {
    const trimmed = partnerName.trim();
    if (!trimmed || trimmed.length < 2) {
      setNameError("Partner name must be at least 2 characters.");
      return;
    }
    if (trimmed.length > 60) {
      setNameError("Partner name must be 60 characters or less.");
      return;
    }
    setNameError(null);
    const newId = generatePartnerId();
    localStorage.setItem("omni_partner_name", trimmed);
    localStorage.setItem("omni_partner_id", newId);
    setPartnerName(trimmed);
    setPartnerId(newId);
    setIsRegistered(true);
  };

  const handleReset = () => {
    localStorage.removeItem("omni_partner_name");
    localStorage.removeItem("omni_partner_id");
    setPartnerName("");
    setPartnerId(null);
    setIsRegistered(false);
  };

  const handleCopyId = () => {
    if (partnerId) {
      navigator.clipboard.writeText(partnerId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  if (isRegistered && partnerId) {
    return (
      <section className="py-12 md:py-14 px-4 md:px-6 bg-background-100">
        <div className="max-w-xl mx-auto">
          <div className="bg-background-50 rounded-xl border border-accent-200/60 p-6 md:p-8 text-center">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-accent-100 mb-4">
              <i className="ri-verified-badge-line text-xl text-accent-600"></i>
            </div>
            <h2 className="font-heading text-xl font-bold text-foreground-950">You're a Registered Partner!</h2>
            <p className="text-sm text-foreground-500 mt-2 mb-6">
              Use your Partner ID in embed codes and API requests to link all your channels together.
            </p>

            <div className="bg-background-100 rounded-lg border border-background-200/70 p-4 mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-400 mb-1">Partner Name</p>
              <p className="text-sm font-semibold text-foreground-900">{partnerName}</p>
            </div>

            <div className="bg-background-100 rounded-lg border border-background-200/70 p-4 mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-400 mb-1">Partner ID</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-background-50 border border-background-200/70 rounded-md px-3 py-2 text-foreground-700 break-all select-all">{partnerId}</code>
                <button
                  onClick={handleCopyId}
                  className="w-9 h-9 flex items-center justify-center flex-shrink-0 rounded-md cursor-pointer text-foreground-500 hover:text-primary-500 hover:bg-primary-50 transition-colors"
                >
                  <i className={`text-sm ${copiedId ? "ri-check-line text-accent-500" : "ri-file-copy-line"}`}></i>
                </button>
              </div>
            </div>

            <div className="bg-background-100 rounded-lg border border-background-200/70 p-4 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-400 mb-3">How to use your Partner ID</p>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-primary-100 flex-shrink-0 mt-0.5"><span className="text-[10px] font-bold text-primary-600">1</span></span>
                  <p className="text-xs text-foreground-600 leading-relaxed">Replace <code className="text-[11px] bg-background-50 px-1.5 py-0.5 rounded border border-background-200/70 font-mono text-primary-500">YOUR_PARTNER_ID</code> in the embed code with your Partner ID above.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-primary-100 flex-shrink-0 mt-0.5"><span className="text-[10px] font-bold text-primary-600">2</span></span>
                  <p className="text-xs text-foreground-600 leading-relaxed">Include it in API request headers as <code className="text-[11px] bg-background-50 px-1.5 py-0.5 rounded border border-background-200/70 font-mono text-primary-500">X-Partner-Id</code>.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-primary-100 flex-shrink-0 mt-0.5"><span className="text-[10px] font-bold text-primary-600">3</span></span>
                  <p className="text-xs text-foreground-600 leading-relaxed">All your connected channels and analytics will be grouped under this Partner ID.</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="mt-5 text-xs font-medium text-foreground-500 hover:text-foreground-700 transition-colors whitespace-nowrap cursor-pointer px-4 py-2 rounded-md border border-background-200/70"
            >
              Reset &amp; Register New Partner
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-14 px-4 md:px-6 bg-background-100">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-100 mb-4">
            <i className="ri-user-add-line text-xs text-primary-600"></i>
            <span className="text-xs font-medium text-primary-700">Partner Registration</span>
          </div>
          <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-950">Register as a Partner</h2>
          <p className="mt-2 text-sm text-foreground-500 max-w-md mx-auto">
            Get your unique Partner ID to use across all channel configurations, embed codes, and API integrations.
          </p>
        </div>

        <div className="bg-background-50 rounded-xl border border-background-200/70 p-6 md:p-8">
          <div className="mb-5">
            <label className="block text-xs font-medium text-foreground-600 mb-2">Partner / Business Name</label>
            <input
              type="text"
              value={partnerName}
              onChange={(e) => { setNameError(null); setPartnerName(e.target.value); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleRegister(); }}
              placeholder="e.g. Acme Corp, MyStore, Jane's Boutique"
              className={`w-full bg-background-50 border rounded-md px-4 py-3 text-sm text-foreground-800 outline-none transition-colors placeholder:text-foreground-300 ${nameError ? "border-red-300 focus:border-red-400" : "border-background-200/70 focus:border-primary-400"}`}
            />
            {nameError && (
              <p className="flex items-center gap-1.5 text-xs text-red-500 mt-1.5">
                <i className="ri-error-warning-line"></i>{nameError}
              </p>
            )}
          </div>

          <div className="bg-background-100 rounded-lg border border-background-200/70 p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-accent-100 flex-shrink-0">
                <i className="ri-key-2-line text-sm text-accent-600"></i>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground-800">What you'll get</p>
                <ul className="mt-1.5 space-y-1">
                  <li className="flex items-center gap-1.5 text-xs text-foreground-500"><i className="ri-check-line text-[10px] text-accent-500"></i> Unique Partner ID for all integrations</li>
                  <li className="flex items-center gap-1.5 text-xs text-foreground-500"><i className="ri-check-line text-[10px] text-accent-500"></i> Unified dashboard across all channels</li>
                  <li className="flex items-center gap-1.5 text-xs text-foreground-500"><i className="ri-check-line text-[10px] text-accent-500"></i> Access to API endpoints and embed codes</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={handleRegister}
            className="w-full text-sm font-semibold bg-primary-500 text-background-50 dark:text-foreground-950 hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer px-5 py-3 rounded-md"
          >
            Generate My Partner ID
          </button>
        </div>
      </div>
    </section>
  );
}