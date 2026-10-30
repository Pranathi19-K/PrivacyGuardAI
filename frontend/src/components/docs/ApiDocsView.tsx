import React, { useState, useEffect } from 'react';
import {
  FileCode2,
  Server,
  Database,
  Sparkles,
  Lock,
  Copy,
  Check,
  ShieldAlert,
  ArrowRight,
  Layers,
  Terminal,
} from 'lucide-react';
import { api } from '../../services/api.ts';

export const ApiDocsView: React.FC = () => {
  const [docs, setDocs] = useState<any>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);

  useEffect(() => {
    api.getApiDocs().then(setDocs).catch(console.error);
  }, []);

  const curlExample = `curl -X POST https://your-privyshield-host/api/mask/text \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Contact customer Alex at alex@example.com or phone 415-555-0199.",
    "title": "Automated Pipeline Mask",
    "strategy": "CATEGORY_TAG"
  }'`;

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlExample);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-blue-700" />
            <h2 className="text-lg font-bold text-slate-900">API Documentation &amp; Architecture</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Production-grade RESTful interface for automated CI/CD pipelines, ETL ingestion, and microservices.
          </p>
        </div>

        <button
          onClick={handleCopyCurl}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-semibold rounded-lg flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedCurl ? 'Copied cURL' : 'Copy cURL Example'}</span>
        </button>
      </div>

      {/* Architecture Overview Diagram */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-700" />
          <span>Security Architecture &amp; Data Minimization Pipeline</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
            <div className="font-bold text-blue-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-mono text-[11px]">1</span>
              <span>Input Ingestion</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Accepts raw text or document files (.txt, .csv, .json, .log). Validates MIME type and size (&le;2MB).
            </p>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
            <div className="font-bold text-emerald-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-mono text-[11px]">2</span>
              <span>Deterministic Engine</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Executes backend Luhn credit check, RFC5322 regexes, and HMAC tokenizers without LLM hallucination risk.
            </p>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
            <div className="font-bold text-indigo-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-mono text-[11px]">3</span>
              <span>AI Risk Modeling</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Google Gemini evaluates privacy exposure and GDPR/HIPAA impact using minimized metadata (zero raw secrets sent).
            </p>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
            <div className="font-bold text-purple-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-mono text-[11px]">4</span>
              <span>Persistent Ledger</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              MongoDB Atlas stores audit metadata, timestamp, and masked excerpt. Raw sensitive text is discarded.
            </p>
          </div>
        </div>
      </div>

      {/* Terminal cURL Card */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-md p-5 text-slate-200 font-mono text-xs space-y-3">
        <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white">cURL Quickstart: Deterministic Masking</span>
          </div>
          <span className="text-[11px]">POST /api/mask/text</span>
        </div>
        <pre className="overflow-x-auto text-emerald-300 py-1 leading-relaxed">{curlExample}</pre>
      </div>

      {/* Endpoints Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Registered REST Endpoints</h3>
        <div className="divide-y divide-slate-100 text-xs">
          {docs?.endpoints?.map((ep: any, idx: number) => {
            const isPost = ep.method === 'POST';
            const isGet = ep.method === 'GET';
            const isDelete = ep.method === 'DELETE';
            return (
              <div key={idx} className="py-3.5 space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                      isPost
                        ? 'bg-blue-100 text-blue-800'
                        : isGet
                        ? 'bg-emerald-100 text-emerald-800'
                        : isDelete
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono font-bold text-slate-900">{ep.path}</span>
                  {ep.authentication && (
                    <span className="text-[10px] text-slate-400 italic">
                      · {ep.authentication}
                    </span>
                  )}
                </div>
                <p className="text-slate-600 text-[11px]">{ep.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
