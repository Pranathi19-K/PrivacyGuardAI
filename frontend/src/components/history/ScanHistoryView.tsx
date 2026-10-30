import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Trash2,
  Eye,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Clock,
  Filter,
  CheckCircle,
  X,
  FileCode,
} from 'lucide-react';
import { ScanAudit, User } from '../../types/index.ts';
import { api } from '../../services/api.ts';

interface ScanHistoryViewProps {
  currentUser: User | null;
  onRefreshStats: () => void;
}

export const ScanHistoryView: React.FC<ScanHistoryViewProps> = ({
  currentUser,
  onRefreshStats,
}) => {
  const [audits, setAudits] = useState<ScanAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAudit, setSelectedAudit] = useState<ScanAudit | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const canDelete = currentUser?.role === 'admin' || currentUser?.role === 'compliance_officer';

  const loadAudits = async (searchTerm?: string) => {
    setLoading(true);
    try {
      const res = await api.getAudits(searchTerm);
      setAudits(res.audits);
    } catch (err: any) {
      console.error('Failed to load audits', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudits(search);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadAudits(search);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scan audit record from the ledger?')) {
      return;
    }

    try {
      await api.deleteAudit(id);
      setStatusMessage('Record removed successfully.');
      setTimeout(() => setStatusMessage(null), 3000);
      loadAudits(search);
      onRefreshStats();
      if (selectedAudit?._id === id || selectedAudit?.id === id) {
        setSelectedAudit(null);
      }
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-700" />
            <h2 className="text-lg font-bold text-slate-900">Privacy Audit Ledger</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-evident log of masking operations. Raw sensitive data is omitted in accordance with data minimization standards.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, filename..."
              className="pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Filter
          </button>
        </form>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading audit records...</div>
        ) : audits.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No audit records match your query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-3 px-4">Audit Record</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Protected Entities</th>
                  <th className="py-3 px-4">Risk Severity</th>
                  <th className="py-3 px-4">Strategy Applied</th>
                  <th className="py-3 px-4">Initiated By</th>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {audits.map((audit) => {
                  const id = audit._id || audit.id;
                  const isCritical = audit.riskLevel === 'critical' || audit.riskLevel === 'high';
                  return (
                    <tr key={id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{audit.title}</div>
                        {audit.fileName && (
                          <div className="text-[11px] font-mono text-slate-400">{audit.fileName}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono uppercase text-slate-600">{audit.inputType}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {audit.totalEntitiesDetected}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            isCritical ? 'text-rose-700' : 'text-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isCritical ? 'bg-rose-600' : 'bg-emerald-600'
                            }`}
                          />
                          <span className="capitalize">{audit.riskLevel}</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            ({audit.riskScore}/100)
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-blue-700 font-semibold">
                        {audit.maskingStrategyUsed}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {audit.userEmail || 'session_user'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(audit.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => setSelectedAudit(audit)}
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                          title="View Audit Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(id!)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Delete Record (Admin / Compliance Role)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Detail Modal */}
      {selectedAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-blue-700" />
                <h3 className="text-base font-bold text-slate-900">Audit Ledger Record</h3>
              </div>
              <button
                onClick={() => setSelectedAudit(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-400 block">Session Title</span>
                <span className="font-semibold text-slate-800">{selectedAudit.title}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-400 block">Masking Strategy</span>
                <span className="font-mono font-semibold text-blue-700">
                  {selectedAudit.maskingStrategyUsed}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-400 block">Execution Latency</span>
                <span className="font-mono text-slate-700">{selectedAudit.executionTimeMs} ms</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-400 block">Entities Shielded</span>
                <span className="font-mono font-bold text-emerald-700">
                  {selectedAudit.totalEntitiesDetected}
                </span>
              </div>
            </div>

            {/* Categories breakdown */}
            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-slate-700 block">Category Distribution</span>
              <div className="flex flex-wrap gap-2">
                {selectedAudit.categories?.map((cat, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 font-mono text-[11px] text-slate-800"
                  >
                    {cat.category}: <strong>{cat.count}</strong>
                  </span>
                ))}
              </div>
            </div>

            {/* Masked Excerpt */}
            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-slate-700 block">
                Sanitized Sample Excerpt (Zero Raw PII Retained)
              </span>
              <div className="p-3 bg-slate-100/80 border border-slate-200 rounded-lg font-mono text-xs text-slate-800 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {selectedAudit.maskedExcerpt || 'No excerpt available.'}
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedAudit(null)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
