import React, { useState, useEffect } from 'react';
import {
  Sliders,
  ShieldCheck,
  Check,
  AlertCircle,
  RefreshCw,
  Lock,
  Layers,
  Info,
} from 'lucide-react';
import { User, MaskingStrategy } from '../../types/index.ts';
import { api } from '../../services/api.ts';

interface PolicyRulesViewProps {
  currentUser: User | null;
}

const STRATEGIES: Array<{ id: MaskingStrategy; name: string }> = [
  { id: 'REDACT', name: 'Solid Redaction [REDACTED]' },
  { id: 'CATEGORY_TAG', name: 'Semantic Tag <CATEGORY>' },
  { id: 'PARTIAL_MASK', name: 'Format-Preserving (j***e@domain.com)' },
  { id: 'SYNTHETIC', name: 'Synthetic Pseudonymization' },
  { id: 'CRYPTOGRAPHIC_HASH', name: 'Cryptographic Hash [HASH:8a7f]' },
];

export const PolicyRulesView: React.FC<PolicyRulesViewProps> = ({ currentUser }) => {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'compliance_officer';

  const loadRules = async () => {
    setLoading(true);
    try {
      const res = await api.getRules();
      setRules(res.rules);
    } catch (err: any) {
      console.error('Failed to load rules', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleUpdateStrategy = async (ruleId: string, strategy: MaskingStrategy) => {
    if (!canEdit) return;
    setSavingId(ruleId);
    try {
      await api.updateRule(ruleId, { defaultStrategy: strategy });
      setRules((prev) =>
        prev.map((r) => (r.ruleId === ruleId ? { ...r, defaultStrategy: strategy } : r))
      );
      setSuccessMsg('Policy rule updated.');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleRule = async (ruleId: string, currentEnabled: boolean) => {
    if (!canEdit) return;
    setSavingId(ruleId);
    try {
      await api.updateRule(ruleId, { isEnabled: !currentEnabled });
      setRules((prev) =>
        prev.map((r) => (r.ruleId === ruleId ? { ...r, isEnabled: !currentEnabled } : r))
      );
      setSuccessMsg('Rule status updated.');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#101f3b] rounded-xl border border-[#263e65] shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-300" />
            <h2 className="text-lg font-bold text-slate-100">Governance &amp; Masking Policies</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Standardize data protection strategies across the organization. Changes dynamically propagate to all backend scanner requests.
          </p>
        </div>

        {!canEdit && (
          <div className="p-2.5 bg-amber-400/10 border border-amber-400/30 text-amber-200 rounded-lg text-xs flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-amber-300" />
            <span>Policy edits require Admin or Compliance Officer credentials.</span>
          </div>
        )}
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-400/10 border border-emerald-400/30 text-emerald-300 text-xs rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Rules Grid */}
      <div className="bg-[#101f3b] rounded-xl border border-[#263e65] shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading policy rules...</div>
        ) : (
          <div className="divide-y divide-[#263e65]">
            {rules.map((rule) => {
              const isBusy = savingId === rule.ruleId;
              const isCritical = rule.severity === 'critical';
              const isHigh = rule.severity === 'high';

              return (
                <div
                  key={rule.ruleId}
                  className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                    !rule.isEnabled ? 'bg-[#0a1830] opacity-60' : 'hover:bg-[#142541]'
                  }`}
                >
                  {/* Left: Info */}
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs text-slate-500 font-bold">
                        {rule.ruleId}
                      </span>
                      <h3 className="text-sm font-bold text-slate-100">{rule.name}</h3>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          isCritical
                            ? 'bg-rose-400/10 text-rose-300'
                            : isHigh
                            ? 'bg-amber-400/10 text-amber-200'
                            : 'bg-cyan-400/10 text-cyan-200'
                        }`}
                      >
                        {rule.severity}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-normal">{rule.description}</p>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium pt-1">
                      <span>Mapped Regulations:</span>
                      {rule.regulations?.map((reg: string) => (
                        <span
                          key={reg}
                          className="px-1.5 py-0.5 bg-[#162a49] text-slate-300 rounded text-[10px] font-mono border border-[#263e65]"
                        >
                          {reg}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right: Strategy selector & Enable toggle */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                    <select
                      value={rule.defaultStrategy}
                      disabled={!canEdit || isBusy || !rule.isEnabled}
                      onChange={(e) =>
                        handleUpdateStrategy(rule.ruleId, e.target.value as MaskingStrategy)
                      }
                      className="bg-[#0a1830] text-slate-100 border border-[#345078] rounded-lg px-3 py-1.5 text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:bg-[#0a1830] disabled:opacity-60"
                    >
                      {STRATEGIES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleToggleRule(rule.ruleId, rule.isEnabled)}
                      disabled={!canEdit || isBusy}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                        rule.isEnabled
                          ? 'bg-emerald-400/10 text-emerald-300 border-emerald-400/40 hover:bg-emerald-400/20'
                          : 'bg-[#162a49] text-slate-400 border-[#345078] hover:bg-[#263e65]'
                      }`}
                    >
                      {isBusy ? 'Saving...' : rule.isEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
