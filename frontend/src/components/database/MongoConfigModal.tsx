import React, { useState } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Shield,
  Key,
} from 'lucide-react';
import { SystemHealthStatus } from '../../types/index.ts';
import { api } from '../../services/api.ts';

interface MongoConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemStatus: SystemHealthStatus | null;
  onRefreshStatus: () => void;
}

export const MongoConfigModal: React.FC<MongoConfigModalProps> = ({
  isOpen,
  onClose,
  systemStatus,
  onRefreshStatus,
}) => {
  const db = systemStatus?.integrations?.database;
  const isConnected = db?.connected;

  const [customUri, setCustomUri] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);

    try {
      const res = await api.reconnectMongo(customUri);
      if (res.success) {
        setTestResult({
          success: true,
          message: `Connected successfully to MongoDB Atlas (${res.status.host || 'remote host'})!`,
        });
        onRefreshStatus();
      } else {
        setTestResult({
          success: false,
          message: res.status.message || 'Connection failed.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection attempt threw an error.',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
              <Database className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">MongoDB Atlas Persistent Storage</h3>
              <p className="text-[11px] text-slate-500">Database Integration &amp; Diagnostic Console</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Status Box */}
        <div
          className={`p-4 rounded-xl border text-xs space-y-2 ${
            isConnected
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-amber-50/70 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold">
              {isConnected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600" />
              )}
              <span>
                {isConnected
                  ? 'MongoDB Atlas Connection Active'
                  : 'MongoDB Atlas Pending Configuration'}
              </span>
            </div>
            <span
              className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                isConnected ? 'bg-emerald-200/60 text-emerald-800' : 'bg-amber-200/60 text-amber-900'
              }`}
            >
              {db?.state || 'unconfigured'}
            </span>
          </div>

          <p className="text-[11px] leading-relaxed">
            {db?.message || 'Database status unavailable.'}
          </p>

          {isConnected && db?.host && (
            <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px] font-mono">
              <span className="text-emerald-700">Cluster Host:</span>
              <span className="font-semibold text-emerald-900">{db.host}</span>
            </div>
          )}
        </div>

        {/* Dynamic Connection String Input Form */}
        <form onSubmit={handleTestConnection} className="space-y-2.5 text-xs">
          <label className="block font-semibold text-slate-700">
            Connect / Test Atlas Connection String
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customUri}
              onChange={(e) => setCustomUri(e.target.value)}
              placeholder="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/privyshield"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="submit"
              disabled={testing || !customUri.trim()}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white font-bold rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>{testing ? 'Testing...' : 'Connect'}</span>
            </button>
          </div>

          {testResult && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </form>

        {/* Atlas Setup Instructions */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-blue-700" />
            <span>MongoDB Atlas Configuration Guide</span>
          </h4>
          <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed">
            <li>Create a free cluster on <a href="https://www.mongodb.com/cloud/atlas" target="_blank" rel="noreferrer" className="text-blue-700 underline font-medium">MongoDB Atlas</a>.</li>
            <li>In <strong>Network Access</strong>, allow IP address access (e.g. <code>0.0.0.0/0</code> for development preview).</li>
            <li>In <strong>Database Access</strong>, create a database user with read/write privileges.</li>
            <li>Copy your connection URI and configure <code>MONGODB_URI</code> in your <code>.env</code> file or paste it in the box above.</li>
          </ol>
        </div>

        <div className="pt-2 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
