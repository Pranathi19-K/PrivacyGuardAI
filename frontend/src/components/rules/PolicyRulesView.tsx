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
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-700" />
            <h2 className="text-lg font-bold text-slate-900">Governance &amp; Masking Policies</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Standardize data protection strategies across the organization. Changes dynamically propagate to all backend scanner requests.
          </p>
        </div>

        {!canEdit && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-amber-700" />
            <span>Policy edits require Admin or Compliance Officer credentials.</span>
          </div>
        )}
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Rules Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading policy rules...</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rules.map((rule) => {
              const isBusy = savingId === rule.ruleId;
              const isCritical = rule.severity === 'critical';
              const isHigh = rule.severity === 'high';

              return (
                <div
                  key={rule.ruleId}
                  className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                    !rule.isEnabled ? 'bg-slate-50/60 opacity-60' : 'hover:bg-slate-50/40'
                  }`}
                >
                  {/* Left: Info */}
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs text-slate-400 font-bold">
                        {rule.ruleId}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{rule.name}</h3>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          isCritical
                            ? 'bg-rose-100 text-rose-800'
                            : isHigh
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {rule.severity}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-normal">{rule.description}</p>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium pt-1">
                      <span>Mapped Regulations:</span>
                      {rule.regulations?.map((reg: string) => (
                        <span
                          key={reg}
                          className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-mono border border-slate-200"
                        >
                          {reg}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right: Strategy selector & Enable toggle */}
                  <div className="flex items-center gap-3 shrink-0">
                    <select
                      value={rule.defaultStrategy}
                      disabled={!canEdit || isBusy || !rule.isEnabled}
                      onChange={(e) =>
                        handleUpdateStrategy(rule.ruleId, e.target.value as MaskingStrategy)
                      }
                      className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100"
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
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
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
