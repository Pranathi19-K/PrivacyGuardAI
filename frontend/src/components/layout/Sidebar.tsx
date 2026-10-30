import React from 'react';
import {
  LayoutDashboard,
  ShieldCheck,
  Lock,
  Sparkles,
  History,
  Sliders,
  FileCode2,
  ShieldAlert,
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onSelectView: (view: string) => void;
  totalProtected?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  totalProtected = 0,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Security Dashboard', icon: LayoutDashboard },
    { id: 'studio', label: 'Masking Studio', icon: Lock },
    { id: 'assistant', label: 'AI Privacy Advisor', icon: Sparkles },
    { id: 'history', label: 'Audit Logs', icon: History },
    { id: 'rules', label: 'Governance Rules', icon: Sliders },
    { id: 'docs', label: 'API & Architecture', icon: FileCode2 },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950/40">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <div className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
            <span>PrivyShield AI</span>
            <span className="text-[10px] font-mono px-1 py-0.2 bg-blue-950 text-blue-400 border border-blue-800/60 rounded">
              PRO
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium truncate max-w-[150px]">
            AI Data Masking &amp; Privacy
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Platform Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Defense-in-depth banner */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/30">
        <div className="rounded-lg bg-blue-950/60 border border-blue-900/50 p-3">
          <div className="flex items-center gap-2 text-blue-300 text-xs font-semibold mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
            <span>Deterministic Guarantee</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Data redaction is executed in deterministic backend routines without relying on LLMs for redaction logic.
          </p>
          <div className="mt-2.5 pt-2 border-t border-blue-900/40 flex justify-between items-center text-[11px]">
            <span className="text-slate-400">Total Shielded</span>
            <span className="font-mono font-bold text-blue-300">{totalProtected} items</span>
          </div>
        </div>
      </div>

      {/* Footnote */}
      <div className="px-5 py-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span>PrivyShield AI v2.5.0</span>
        <span className="text-emerald-500 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Engine Live
        </span>
      </div>
    </aside>
  );
};
