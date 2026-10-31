import React, { useState } from 'react';
import {
  Lock,
  UploadCloud,
  FileText,
  Copy,
  Check,
  Download,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Sliders,
  ChevronDown,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileCode,
} from 'lucide-react';
import { MaskResult, MaskingStrategy, EntityCategory } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { EntityInspector } from './EntityInspector.tsx';

interface MaskingStudioViewProps {
  onOpenRiskModal: (result: MaskResult, originalText: string) => void;
  onRefreshStats: () => void;
}

const SAMPLE_DATASETS = [
  {
    id: 'healthcare',
    name: 'Healthcare Intake (HIPAA)',
    title: 'Patient Clinical Intake #9182',
    text: `CONFIDENTIAL MEDICAL INTAKE:
Patient Name: Jonathan Alexander Davis
DOB: 04/18/1979
Social Security Number: 921-48-2910
Contact Phone: (415) 555-8921
Primary Email: j.davis79@medical-archive.org
Residential Address: 482 Willow Creek Way, Austin, TX 78701
Emergency Contact: Dr. Sarah Connor, Phone: +1-512-555-0144
Clinical Notes: Patient presented with symptoms of mild angina. Statin therapy prescribed.`,
  },
  {
    id: 'financial',
    name: 'FinTech Wire (PCI-DSS)',
    title: 'Merchant Wire Confirmation #0849',
    text: `INTERNATIONAL WIRE SETTLEMENT:
Customer: Elizabeth Vance
Card Number: 4532 8920 1928 4242
Cardholder Email: e.vance@vancetech.com
Direct Line: +1-202-555-0193
Billing Street: 1200 Constitution Ave, Washington, DC 20001
Transaction Total: $14,250.00 USD
Routing Account: 021000021
Reference Token: AKIAIOSFODNN7EXAMPLE`,
  },
  {
    id: 'devops',
    name: 'DevOps Log Leak (Secrets)',
    title: 'Production Gateway Error Trace',
    text: `[2026-10-27T08:14:02.192Z] [ERROR] [auth-gateway]
Connection failed from client IP 192.168.1.105:
Header contains compromised secret: api_key="[REDACTED_STRIPE_SECRET]"
JWT Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
Responsible Engineer: devops-oncall@cloudmatrix.io
Server Node: 10.0.4.88`,
  },
  {
    id: 'crm',
    name: 'Customer Support CRM',
    title: 'Customer Refund Support Ticket',
    text: `CRM TICKET #49021:
Customer Name: Robert Taylor
Contact: robert.taylor@gmail.com, Mobile: 415-555-9081
User registered at: 742 Evergreen Terrace, Springfield, OR 97477
User verified identity using National ID: 984-21-0094
Refund requested for purchase billed to card: 4000 1234 5678 9010.`,
  },
];

const STRATEGIES: Array<{ id: MaskingStrategy; name: string; desc: string }> = [
  {
    id: 'CATEGORY_TAG',
    name: 'Semantic Entity Tag',
    desc: 'Replaces with typed token e.g. <EMAIL_ADDRESS>, ideal for LLM context.',
  },
  {
    id: 'REDACT',
    name: 'Solid Redaction',
    desc: 'Replaces with strict block token [REDACTED]. Maximum security.',
  },
  {
    id: 'PARTIAL_MASK',
    name: 'Format-Preserving Mask',
    desc: 'Retains prefixes/suffixes (j***e@domain.com, â€¢â€¢â€¢â€¢ 4242) for operational review.',
  },
  {
    id: 'SYNTHETIC',
    name: 'Synthetic Pseudonym',
    desc: 'Substitutes with synthetic realistic placeholders for development testing.',
  },
  {
    id: 'CRYPTOGRAPHIC_HASH',
    name: 'HMAC Cryptographic Hash',
    desc: 'Deterministic salted hash [HASH:8a7f] allowing analytical joins without PII leakage.',
  },
];

export const MaskingStudioView: React.FC<MaskingStudioViewProps> = ({
  onOpenRiskModal,
  onRefreshStats,
}) => {
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');
  const [inputText, setInputText] = useState(SAMPLE_DATASETS[0].text);
  const [sessionTitle, setSessionTitle] = useState(SAMPLE_DATASETS[0].title);
  const [selectedStrategy, setSelectedStrategy] = useState<MaskingStrategy>('CATEGORY_TAG');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MaskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Active session text for side-by-side comparison
  const [sessionOriginalText, setSessionOriginalText] = useState<string>(SAMPLE_DATASETS[0].text);

  const handleSelectSample = (sample: typeof SAMPLE_DATASETS[0]) => {
    setInputText(sample.text);
    setSessionTitle(sample.title);
    setInputMode('text');
    setSelectedFile(null);
  };

  const handleProcessText = async () => {
    if (!inputText.trim()) {
      setError('Please provide text to scan and mask.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.maskText({
        text: inputText,
        title: sessionTitle || 'Interactive Text Scan',
        strategy: selectedStrategy,
      });

      setResult(response.data);
      setSessionOriginalText(inputText);
      onRefreshStats();
    } catch (err: any) {
      setError(err.message || 'Masking operation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessFile = async () => {
    if (!selectedFile) {
      setError('Please select a text-based document to upload.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('strategy', selectedStrategy);
      formData.append('title', sessionTitle || `Document: ${selectedFile.name}`);

      const response = await api.maskDocument(formData);
      setResult(response.data);
      setSessionOriginalText(`[File content of: ${selectedFile.name}]`);
      onRefreshStats();
    } catch (err: any) {
      setError(err.message || 'File processing failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMasked = () => {
    if (!result?.maskedText) return;
    navigator.clipboard.writeText(result.maskedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMasked = () => {
    if (!result?.maskedText) return;
    const blob = new Blob([result.maskedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `privyshield_sanitized_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAuditJson = () => {
    if (!result) return;
    const exportData = {
      platform: 'PrivyShield AI â€“ AI-Powered Sensitive Data Masking & Privacy Protection',
      version: '2.5.0-enterprise',
      timestamp: new Date().toISOString(),
      auditId: result.auditId,
      strategyApplied: selectedStrategy,
      statistics: result.statistics,
      detectedEntitiesCount: result.entitiesCount,
      detectedEntitiesSummary: result.entities.map((e) => ({
        id: e.id,
        category: e.category,
        confidence: e.confidence,
        severity: e.severity,
        ruleTriggered: e.ruleTriggered,
        startIndex: e.startIndex,
        endIndex: e.endIndex,
      })),
      maskedOutputExcerpt: result.maskedText.substring(0, 500),
      disclaimer: 'Deterministic masking completed. No raw sensitive text was persisted in audit log.',
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `privyshield_audit_report_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Configuration & Input Section */}
      <div className="bg-[#101f3b] rounded-xl border border-[#263e65] shadow-xs p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Deterministic Masking Studio</h2>
            <p className="text-xs text-slate-400">
              Scan raw text or document files, identify sensitive tokens with regex/Luhn algorithms, and apply policy masking.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-[#162a49] rounded-lg shrink-0">
            <button
              onClick={() => setInputMode('text')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                inputMode === 'text'
                  ? 'bg-[#101f3b] text-cyan-100 shadow-xs'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Direct Text Input
            </button>
            <button
              onClick={() => setInputMode('file')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                inputMode === 'file'
                  ? 'bg-[#101f3b] text-cyan-100 shadow-xs'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Document Upload (.csv, .json, .txt, .log)
            </button>
          </div>
        </div>

        {/* Preset Sample Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Load Sample:</span>
          </span>
          {SAMPLE_DATASETS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleSelectSample(sample)}
              className="px-2.5 py-1 rounded-md bg-[#162a49] hover:bg-cyan-400/10 hover:text-cyan-300 text-slate-300 border border-[#263e65] text-xs font-medium shrink-0 transition-colors cursor-pointer"
            >
              {sample.name}
            </button>
          ))}
        </div>

        {/* Input Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Session Title / Reference Identifier
            </label>
            <input
              type="text"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder="e.g. Patient Onboarding Batch or Support Incident #420"
              className="w-full px-3 py-2 text-xs border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Deterministic Masking Strategy
            </label>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value as MaskingStrategy)}
              className="w-full px-3 py-2 text-xs border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-[#101f3b] font-medium text-slate-200"
            >
              {STRATEGIES.map((strat) => (
                <option key={strat.id} value={strat.id}>
                  {strat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Input Area */}
        {inputMode === 'text' ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Sensitive Payload Input (UTF-8 Plaintext)</span>
              <span className="font-mono">{inputText.length} characters</span>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={8}
              placeholder="Paste sensitive text, customer support logs, intake forms, or API payloads here..."
              className="w-full p-3 font-mono text-xs border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-[#0a1830] text-slate-200 leading-relaxed"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-blue-500 transition-colors bg-[#0a1830]">
              <UploadCloud className="w-10 h-10 text-cyan-300 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-200">
                Choose text-based document to scan
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Supported formats: <code className="font-mono text-cyan-300">.txt, .csv, .json, .log, .md, .tsv</code> (Max 2MB)
              </p>
              <input
                type="file"
                id="file-upload"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setSelectedFile(e.target.files[0]);
                    setSessionTitle(`Document Scan: ${e.target.files[0].name}`);
                  }
                }}
                className="hidden"
                accept=".txt,.csv,.json,.log,.md,.tsv,.xml,.yaml,.yml,text/*"
              />
              <label
                htmlFor="file-upload"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-cyan-400/100 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-xs transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Select Document</span>
              </label>

              {selectedFile && (
                <div className="mt-3 p-2 bg-cyan-400/10 border border-cyan-400/30 rounded-lg inline-flex items-center gap-2 text-xs font-mono text-cyan-100">
                  <FileCode className="w-4 h-4 text-cyan-300" />
                  <span className="font-bold">{selectedFile.name}</span>
                  <span className="text-cyan-300">({Math.round(selectedFile.size / 1024)} KB)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Process Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Zero raw data retention: Original content is discarded once session completes.</span>
          </div>

          <button
            onClick={inputMode === 'text' ? handleProcessText : handleProcessFile}
            disabled={isLoading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-cyan-400/100 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Analyzing &amp; Masking...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Run Deterministic Masking</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Masked Output Section */}
      {result && (
        <div className="space-y-6">
          <div className="bg-[#101f3b] rounded-xl border border-[#263e65] shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/100"></div>
                <h3 className="text-sm font-bold text-slate-100">Masked Output &amp; Protection Report</h3>
                <span className="text-xs font-mono text-slate-400">({result.statistics.executionTimeMs}ms)</span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCopyMasked}
                  className="px-3 py-1.5 bg-[#162a49] hover:bg-[#263e65] text-slate-300 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Masked Text'}</span>
                </button>

                <button
                  onClick={handleDownloadMasked}
                  className="px-3 py-1.5 bg-[#162a49] hover:bg-[#263e65] text-slate-300 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Text</span>
                </button>

                <button
                  onClick={handleExportAuditJson}
                  className="px-3 py-1.5 bg-[#162a49] hover:bg-[#263e65] text-slate-300 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Export Audit JSON</span>
                </button>

                <button
                  onClick={() => onOpenRiskModal(result, sessionOriginalText)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-cyan-400/100 text-white text-xs font-bold rounded-md flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                  <span>Evaluate Regulatory Risks (Gemini)</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-[#0a1830] rounded-lg text-xs">
              <div>
                <span className="text-slate-400 block">Entities Found</span>
                <span className="font-mono font-bold text-slate-100 text-sm">
                  {result.entitiesCount} items
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Risk Evaluation</span>
                <span
                  className={`font-semibold capitalize text-sm ${
                    result.statistics.riskLevel === 'critical' || result.statistics.riskLevel === 'high'
                      ? 'text-rose-700'
                      : 'text-slate-200'
                  }`}
                >
                  {result.statistics.riskLevel} ({result.statistics.riskScore}/100)
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Strategy Deployed</span>
                <span className="font-mono font-medium text-slate-200 text-xs">
                  {selectedStrategy}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Audit Record</span>
                <span className="font-mono text-slate-400 text-[11px] truncate block">
                  #{result.auditId || 'session-local'}
                </span>
              </div>
            </div>

            {/* Side by Side Content View */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Original Preview (Session Only) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-400">
                    Original Payload (Session-Only View)
                  </span>
                  <span className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                    Ephemeral Session
                  </span>
                </div>
                <div className="p-3 bg-[#162a49]/70 border border-[#263e65] rounded-lg font-mono text-xs text-slate-200 whitespace-pre-wrap h-64 overflow-y-auto leading-relaxed">
                  {sessionOriginalText}
                </div>
              </div>

              {/* Masked Output */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-emerald-300">
                    Deterministic Masked Payload (Ready for Distribution)
                  </span>
                  <span className="text-[11px] text-emerald-700 bg-emerald-400/10 px-1.5 py-0.2 rounded border border-emerald-200">
                    Redacted
                  </span>
                </div>
                <div className="p-3 bg-[#101f3b] border border-emerald-400/40 rounded-lg font-mono text-xs text-slate-100 whitespace-pre-wrap h-64 overflow-y-auto leading-relaxed selection:bg-emerald-200">
                  {result.maskedText}
                </div>
              </div>
            </div>
          </div>

          {/* Granular Entity Inspector Table */}
          <EntityInspector
            entities={result.entities}
            transformations={result.transformations}
          />
        </div>
      )}
    </div>
  );
};
