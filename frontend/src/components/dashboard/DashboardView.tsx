import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  FileText,
  Activity,
  AlertTriangle,
  ArrowRight,
  Database,
  Sparkles,
  Lock,
  Layers,
  Clock,
  Eye,
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

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-700/60 text-blue-200 text-xs font-medium mb-2 border border-blue-600/40">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
            <span>AI-Powered Sensitive Data Masking &amp; Privacy Protection</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Privacy Operations Console</h1>
          <p className="text-blue-200 text-sm mt-1 max-w-2xl leading-relaxed">
            Eliminate sensitive PII, credentials, and financial identifiers before data reaches downstream systems, external partners, or LLM contexts.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onNavigateToStudio}
            className="px-4 py-2.5 bg-white text-blue-900 hover:bg-blue-50 font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4 text-blue-700" />
            <span>Open Masking Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onNavigateToAssistant}
            className="px-4 py-2.5 bg-blue-700/80 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg border border-blue-500/50 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            <span>AI Advisor</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Content Scans</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">{totalScans}</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span>Documents &amp; direct payloads</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Sensitive Entities Shielded</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2 font-mono">{totalProtected}</div>
          <div className="text-xs text-slate-500 mt-1">
            <span>Deterministic redaction executed</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>High Risk Incidents Neutralized</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-2 font-mono">{highRiskScans}</div>
          <div className="text-xs text-slate-500 mt-1">
            <span>SSN, Card numbers, API tokens</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Clean Scans (Zero PII)</span>
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">{cleanScans}</div>
          <div className="text-xs text-slate-500 mt-1">
            <span>Compliant for release</span>
          </div>
        </div>
      </div>

      {/* Grid: Category Breakdown + System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Detected Entity Categories</h2>
              <p className="text-xs text-slate-500">Distribution of shielded data types across all operations</p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {categoryEntries.length} active classifications
            </span>
          </div>

          {categoryEntries.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
              No entities detected yet. Start scanning documents in Masking Studio!
            </div>
          ) : (
            <div className="space-y-3">
              {categoryEntries.map(([cat, count]) => {
                const total = totalProtected || 1;
                const pct = Math.round(((count as number) / total) * 100);
                const isCritical = cat.includes('CARD') || cat.includes('SSN') || cat.includes('SECRET');
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isCritical ? 'bg-rose-500' : 'bg-blue-600'
                          }`}
                        />
                        {cat.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-900 font-bold">{count as number}</span>
                        <span className="text-slate-400 text-[11px]">({pct}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isCritical ? 'bg-rose-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Integration Status & System Guarantees */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-1">Architecture &amp; Resilience</h2>
            <p className="text-xs text-slate-500 mb-4">Core backend services and integrity verification</p>

            <div className="space-y-3.5">
              {/* MongoDB */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">Persistent Storage</span>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      systemStatus?.integrations?.database?.connected
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {systemStatus?.integrations?.database?.connected ? 'Atlas Connected' : 'Session Fallback'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  {systemStatus?.integrations?.database?.message || 'MongoDB Atlas persistent store'}
                </p>
              </div>

              {/* Gemini */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">Generative AI Engine</span>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      systemStatus?.integrations?.generativeAi?.available
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {systemStatus?.integrations?.generativeAi?.available ? 'Gemini 3.8 Flash' : 'Config Pending'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  {systemStatus?.integrations?.generativeAi?.message || 'Google GenAI SDK configured'}
                </p>
              </div>

              {/* Deterministic Masker */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800">Deterministic Engine</span>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Guaranteed
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Backend Luhn validator, RFC 5322 regexes, and HMAC tokenizers run without AI hallucination risk.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-400">
            Defense-in-depth: Raw sensitive content is never stored in persistent audit tables.
          </div>
        </div>
      </div>

      {/* Recent Scans Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Privacy Audits</h2>
            <p className="text-xs text-slate-500">Immutable execution ledger without raw PII persistence</p>
          </div>
          <button
            onClick={onNavigateToAudits}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
          >
            <span>View Full Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentAudits.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            No audit records found. Run your first scan in Masking Studio!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Title / Target</th>
                  <th className="py-2.5 px-3">Input Type</th>
                  <th className="py-2.5 px-3">Entities Found</th>
                  <th className="py-2.5 px-3">Risk Assessment</th>
                  <th className="py-2.5 px-3">Strategy</th>
                  <th className="py-2.5 px-3">Latency</th>
                  <th className="py-2.5 px-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentAudits.map((audit) => {
                  const isHigh = audit.riskLevel === 'high' || audit.riskLevel === 'critical';
                  return (
                    <tr key={audit._id || audit.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-medium text-slate-900">
                        {audit.title}
                        {audit.fileName && (
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{audit.fileName}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="capitalize text-slate-600 font-mono">{audit.inputType}</span>
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                        {audit.totalEntitiesDetected}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            isHigh ? 'text-rose-700' : 'text-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isHigh ? 'bg-rose-600' : 'bg-emerald-600'
                            }`}
                          />
                          <span className="capitalize">{audit.riskLevel}</span>
                          <span className="text-[11px] text-slate-400 font-mono">({audit.riskScore}/100)</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                        {audit.maskingStrategyUsed}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                        {audit.executionTimeMs}ms
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400 font-mono text-[11px]">
                        {new Date(audit.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
