import React from 'react';
import {
  ShieldCheck,
  Database,
  Sparkles,
  User as UserIcon,
  LogOut,
  ChevronRight,
  Sliders,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { User, SystemHealthStatus } from '../../types/index.ts';

interface HeaderProps {
  currentUser: User | null;
  systemStatus: SystemHealthStatus | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenMongoConfig: () => void;
  activeView: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  systemStatus,
  onOpenAuth,
  onLogout,
  onOpenMongoConfig,
  activeView,
}) => {
  const isMongoConnected = systemStatus?.integrations?.database?.connected;
  const isGeminiAvailable = systemStatus?.integrations?.generativeAi?.available;

  const viewTitles: Record<string, string> = {
    dashboard: 'Security Posture & Telemetry',
    studio: 'Deterministic Masking Studio',
    assistant: 'AI Privacy & Regulatory Advisor',
    history: 'Privacy Audit Ledger',
    rules: 'Data Masking Governance Rules',
    docs: 'API Specification & Architecture',
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-6 flex items-center justify-between shadow-xs">
      {/* Breadcrumb / Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center text-xs font-medium text-slate-500 uppercase tracking-wider">
          <span className="text-blue-700 font-semibold">PrivyShield AI</span>
          <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-400" />
          <span className="text-slate-800">{viewTitles[activeView] || 'Platform'}</span>
        </div>
      </div>

      {/* Statuses & User Profile */}
      <div className="flex items-center gap-3">
        {/* MongoDB Connection Status Button */}
        <button
          onClick={onOpenMongoConfig}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            isMongoConnected
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
          }`}
          title="Click to view MongoDB Atlas status or configure connection"
        >
          <Database className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {isMongoConnected ? 'MongoDB Atlas Online' : 'MongoDB Unconfigured (Session Mode)'}
          </span>
          <span className="sm:hidden">{isMongoConnected ? 'Atlas' : 'Session'}</span>
          {isMongoConnected ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          )}
        </button>

        {/* Gemini AI Status Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
            isGeminiAvailable
              ? 'bg-blue-50 text-blue-900 border-blue-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
          title={systemStatus?.integrations?.generativeAi?.message || 'Gemini 3.8 Flash'}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden md:inline">
            {isGeminiAvailable ? 'Gemini 3.8 Flash Active' : 'Gemini Key Pending'}
          </span>
        </div>

        {/* User Account / Auth */}
        {currentUser ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="text-right hidden lg:block">
              <div className="text-xs font-semibold text-slate-900 leading-tight">
                {currentUser.name}
              </div>
              <div className="text-[11px] text-blue-700 capitalize font-medium">
                {currentUser.role.replace('_', ' ')}
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
              {currentUser.name.charAt(0)}
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Sign In / Roles</span>
          </button>
        )}
      </div>
    </header>
  );
};
