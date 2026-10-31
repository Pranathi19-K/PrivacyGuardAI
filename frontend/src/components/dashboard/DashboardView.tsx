import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  FileText,
  Activity,
  ArrowRight,
  Database,
  Sparkles,
  Lock,
} from 'lucide-react';
import { SystemHealthStatus, ScanAudit } from '../../types/index.ts';

interface DashboardViewProps {
  stats: any;
  systemStatus: SystemHealthStatus | null;
  onNavigateToStudio: () => void;
  onNavigateToAudits: () => void;
  onNavigateToAssistant: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  systemStatus,
  onNavigateToStudio,
  onNavigateToAudits,
  onNavigateToAssistant,
}) => {
  const totalScans = stats?.totalScans || 0;
  const totalProtected = stats?.totalEntitiesProtected || 0;
  const highRiskScans = stats?.highRiskScans || 0;
  const cleanScans = stats?.cleanScans || 0;
  const categoryBreakdown = stats?.categoryBreakdown || {};
  const recentAudits: ScanAudit[] = stats?.recentAudits || [];
  const categoryEntries = Object.entries(categoryBreakdown);

  const cardClass = 'rounded-xl border border-[#263e65] bg-[#101f3b] p-5 shadow-lg shadow-black/10';
  const labelClass = 'text-xs font-medium text-slate-400';

  return (
    <div className="-m-3 min-h-full bg-[#071329] p-3 text-slate-100 sm:-m-4 sm:p-4 md:-m-8 md:p-8 space-y-6">

      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-blue-400/20 bg-gradient-to-r from-[#102b58] via-[#123b78] to-[#10204b] p-5 sm:p-7 shadow-xl">
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-medium text-cyan-200">
              <ShieldCheck className="h-4 w-4" />
              AI-Powered Sensitive Data Protection
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Privacy Operations Console
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-blue-100/80">
              Detect and mask sensitive PII, credentials and financial identifiers before data reaches external systems or AI models.
            </p>
          </div>

          <div className="relative flex flex-wrap gap-2">
            <button
              onClick={onNavigateToStudio}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-xs font-bold text-white shadow-lg transition hover:bg-blue-500"
            >
              <Lock className="h-4 w-4" />
              Open Masking Studio
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onNavigateToAssistant}
              className="flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
            >
              <Sparkles className="h-4 w-4" />
              AI Advisor
            </button>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <span className={labelClass}>Total Content Scans</span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-300">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 font-mono text-3xl font-bold text-white">{totalScans}</div>
          <p className="mt-1 text-xs text-slate-400">Documents &amp; direct payloads</p>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <span className={labelClass}>Sensitive Entities Shielded</span>
            <div className="rounded-lg bg-cyan-400/10 p-2 text-cyan-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 font-mono text-3xl font-bold text-cyan-300">{totalProtected}</div>
          <p className="mt-1 text-xs text-slate-400">Deterministic redaction executed</p>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <span className={labelClass}>High Risk Incidents Neutralized</span>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 font-mono text-3xl font-bold text-rose-400">{highRiskScans}</div>
          <p className="mt-1 text-xs text-slate-400">SSN, Card numbers, API tokens</p>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <span className={labelClass}>Clean Scans (Zero PII)</span>
            <div className="rounded-lg bg-indigo-400/10 p-2 text-indigo-300">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 font-mono text-3xl font-bold text-white">{cleanScans}</div>
          <p className="mt-1 text-xs text-slate-400">Compliant for release</p>
        </div>
      </section>

      {/* Categories and System Health */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className={`${cardClass} lg:col-span-2`}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-white">Detected Entity Categories</h2>
              <p className="mt-1 text-xs text-slate-400">Distribution of protected data types</p>
            </div>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-200">
              {categoryEntries.length} active classifications
            </span>
          </div>

          {categoryEntries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-600 py-10 text-center text-sm text-slate-400">
              No entities detected yet. Start scanning documents in Masking Studio!
            </div>
          ) : (
            <div className="space-y-5">
              {categoryEntries.map(([cat, count]) => {
                const total = totalProtected || 1;
                const pct = Math.round(((count as number) / total) * 100);
                const isCritical = cat.includes('CARD') || cat.includes('SSN') || cat.includes('SECRET');

                return (
                  <div key={cat} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="flex items-center gap-2 font-semibold text-slate-200">
                        <span className={`h-2 w-2 rounded-full ${isCritical ? 'bg-rose-400' : 'bg-cyan-400'}`} />
                        {cat.replace(/_/g, ' ')}
                      </span>
                      <span className="shrink-0 font-mono text-slate-300">
                        {count as number} <span className="text-slate-500">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${isCritical ? 'bg-rose-400' : 'bg-gradient-to-r from-blue-500 to-cyan-400'}`}
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* System Status */}
        <div className={`${cardClass} flex flex-col`}>
          <div className="mb-4">
            <h2 className="text-base font-bold text-white">Architecture &amp; Resilience</h2>
            <p className="mt-1 text-xs text-slate-400">Core backend services and integrity</p>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-slate-700 bg-[#0a1830] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-cyan-300" />
                  <span className="text-xs font-semibold text-slate-200">Persistent Storage</span>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${systemStatus?.integrations?.database?.connected ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-300'}`}>
                  {systemStatus?.integrations?.database?.connected ? 'Atlas Connected' : 'Session Fallback'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                {systemStatus?.integrations?.database?.message || 'MongoDB Atlas persistent store'}
              </p>
            </div>

            <div className="rounded-lg border border-slate-700 bg-[#0a1830] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-300" />
                  <span className="text-xs font-semibold text-slate-200">Generative AI Engine</span>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${systemStatus?.integrations?.generativeAi?.available ? 'bg-cyan-400/10 text-cyan-200' : 'bg-slate-700 text-slate-300'}`}>
                  {systemStatus?.integrations?.generativeAi?.available ? 'Gemini 3.8 Flash' : 'Config Pending'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                {systemStatus?.integrations?.generativeAi?.message || 'Google GenAI SDK configured'}
              </p>
            </div>

            <div className="rounded-lg border border-slate-700 bg-[#0a1830] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-cyan-300" />
                  <span className="text-xs font-semibold text-slate-200">Deterministic Engine</span>
                </div>
                <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                  Guaranteed
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Backend Luhn validator, RFC 5322 regexes, and HMAC tokenizers run without AI hallucination risk.
              </p>
            </div>
          </div>

          <div className="mt-auto border-t border-slate-700 pt-3 text-[11px] leading-relaxed text-slate-500">
            Defense-in-depth: Raw sensitive content is never stored in persistent audit tables.
          </div>
        </div>
      </section>

      {/* Recent Audits */}
      <section className={cardClass}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">Recent Privacy Audits</h2>
            <p className="mt-1 text-xs text-slate-400">Immutable execution ledger without raw PII persistence</p>
          </div>
          <button
            onClick={onNavigateToAudits}
            className="flex items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-300/20"
          >
            View Full Ledger <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {recentAudits.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            No audit records found. Run your first scan in Masking Studio!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-3">Title / Target</th>
                  <th className="px-3 py-3">Input Type</th>
                  <th className="px-3 py-3">Entities Found</th>
                  <th className="px-3 py-3">Risk Assessment</th>
                  <th className="px-3 py-3">Strategy</th>
                  <th className="px-3 py-3">Latency</th>
                  <th className="px-3 py-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/70">
                {recentAudits.map((audit) => {
                  const isHigh = audit.riskLevel === 'high' || audit.riskLevel === 'critical';

                  return (
                    <tr key={audit._id || audit.id} className="transition hover:bg-blue-400/5">
                      <td className="px-3 py-3 font-medium text-slate-200">
                        {audit.title}
                        {audit.fileName && (
                          <div className="mt-1 font-mono text-[10px] text-slate-500">{audit.fileName}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono capitalize text-slate-300">{audit.inputType}</td>
                      <td className="px-3 py-3 font-mono font-semibold text-cyan-200">{audit.totalEntitiesDetected}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1.5 font-semibold ${isHigh ? 'text-rose-400' : 'text-emerald-300'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isHigh ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                          <span className="capitalize">{audit.riskLevel}</span>
                          <span className="font-mono text-slate-500">({audit.riskScore}/100)</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-slate-300">{audit.maskingStrategyUsed}</td>
                      <td className="px-3 py-3 font-mono text-[11px] text-slate-400">{audit.executionTimeMs}ms</td>
                      <td className="px-3 py-3 text-right font-mono text-[11px] text-slate-400">
                        {new Date(audit.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
