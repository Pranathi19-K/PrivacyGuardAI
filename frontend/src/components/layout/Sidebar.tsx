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
  X,
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onSelectView: (view: string) => void;
  totalProtected?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  totalProtected = 0,
  isOpen = false,
  onClose,
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
    <>
      {isOpen && (
        <button
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none transition-transform duration-300 md:relative md:z-auto md:w-64 md:max-w-none md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="h-16 min-h-16 px-5 flex items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>PrivyShield AI</span>
                <span className="text-[10px] font-mono px-1 py-0.2 bg-blue-950 text-blue-400 border border-blue-800/60 rounded">
                  PRO
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium truncate">
                AI Data Masking &amp; Privacy
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
                onClick={() => {
                  onSelectView(item.id);
                  onClose?.();
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

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
              <span className="font-mono font-bold text-blue-300">
                {totalProtected} items
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>PrivyShield AI v2.5.0</span>
          <span className="text-emerald-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Engine Live
          </span>
        </div>
      </aside>
    </>
  );
};
