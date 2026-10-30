import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { DashboardView } from './components/dashboard/DashboardView.tsx';
import { MaskingStudioView } from './components/masking/MaskingStudioView.tsx';
import { PrivacyAssistantView } from './components/ai/PrivacyAssistantView.tsx';
import { ScanHistoryView } from './components/history/ScanHistoryView.tsx';
import { PolicyRulesView } from './components/rules/PolicyRulesView.tsx';
import { ApiDocsView } from './components/docs/ApiDocsView.tsx';
import { RiskAssessmentModal } from './components/ai/RiskAssessmentModal.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { MongoConfigModal } from './components/database/MongoConfigModal.tsx';
import { User, SystemHealthStatus, MaskResult } from './types/index.ts';
import { api, getStoredUser, clearStoredAuth, getStoredToken } from './services/api.ts';

export default function App() {
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser());
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [systemStatus, setSystemStatus] = useState<SystemHealthStatus | null>(null);
  const [stats, setStats] = useState<any>(null);

  const [isAuthOpen, setIsAuthOpen] = useState(!getStoredToken());
  const [isMongoModalOpen, setIsMongoModalOpen] = useState(false);
  const [riskModalState, setRiskModalState] = useState<{
    isOpen: boolean;
    result: MaskResult | null;
    originalText: string;
  }>({
    isOpen: false,
    result: null,
    originalText: '',
  });

  const fetchStatusAndStats = async () => {
    try {
      const [statusRes, statsRes] = await Promise.all([
        api.getStatus().catch((e) => {
          console.warn('Status fetch error', e);
          return null;
        }),
        api.getStats().catch((e) => {
          console.warn('Stats fetch error', e);
          return null;
        }),
      ]);

      if (statusRes) setSystemStatus(statusRes);
      if (statsRes?.stats) setStats(statsRes.stats);
    } catch (err) {
      console.error('System sync error', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const token = getStoredToken();

      if (!token) {
        if (isMounted) {
          clearStoredAuth();
          setCurrentUser(null);
          setIsAuthOpen(true);
          setIsAuthChecking(false);
        }
        return;
      }

      try {
        const res = await api.getProfile();
        if (isMounted) {
          setCurrentUser(res.user);
          setIsAuthOpen(false);
          await fetchStatusAndStats();
        }
      } catch {
        clearStoredAuth();
        if (isMounted) {
          setCurrentUser(null);
          setIsAuthOpen(true);
        }
      } finally {
        if (isMounted) setIsAuthChecking(false);
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUser || isAuthChecking) return;

    const interval = setInterval(fetchStatusAndStats, 30000);
    return () => clearInterval(interval);
  }, [currentUser, isAuthChecking]);

  const handleLogout = () => {
    clearStoredAuth();
    setCurrentUser(null);
    setStats(null);
    setActiveView('dashboard');
    setIsMongoModalOpen(false);
    setIsAuthOpen(true);
  };

  const handleOpenRiskModal = (result: MaskResult, originalText: string) => {
    setRiskModalState({
      isOpen: true,
      result,
      originalText,
    });
  };

  if (isAuthChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-300 border-t-transparent" />
          <p className="text-sm font-semibold">Verifying secure session...</p>
          <p className="text-xs text-slate-400">PrivyShield AI</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-white p-6 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-700 text-xl font-bold text-white">
              P
            </div>
            <h1 className="text-xl font-bold text-slate-900">PrivyShield AI</h1>
            <p className="mt-1 text-xs text-slate-500">
              Secure Sensitive Data Protection Platform
            </p>
          </div>
          <AuthModal
            isOpen={true}
            onClose={() => setIsAuthOpen(true)}
            onSuccess={(user) => {
              setCurrentUser(user);
              setIsAuthOpen(false);
              setActiveView('dashboard');
              fetchStatusAndStats();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900 antialiased">
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        totalProtected={stats?.totalEntitiesProtected || 0}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          currentUser={currentUser}
          systemStatus={systemStatus}
          onOpenAuth={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
          onOpenMongoConfig={() => setIsMongoModalOpen(true)}
          activeView={activeView}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {activeView === 'dashboard' && (
              <DashboardView
                stats={stats}
                systemStatus={systemStatus}
                onNavigateToStudio={() => setActiveView('studio')}
                onNavigateToAudits={() => setActiveView('history')}
                onNavigateToAssistant={() => setActiveView('assistant')}
              />
            )}

            {activeView === 'studio' && (
              <MaskingStudioView
                onOpenRiskModal={handleOpenRiskModal}
                onRefreshStats={fetchStatusAndStats}
              />
            )}

            {activeView === 'assistant' && <PrivacyAssistantView />}

            {activeView === 'history' && (
              <ScanHistoryView
                currentUser={currentUser}
                onRefreshStats={fetchStatusAndStats}
              />
            )}

            {activeView === 'rules' && <PolicyRulesView currentUser={currentUser} />}

            {activeView === 'docs' && <ApiDocsView />}
          </div>
        </main>
      </div>

      <RiskAssessmentModal
        isOpen={riskModalState.isOpen}
        onClose={() => setRiskModalState((prev) => ({ ...prev, isOpen: false }))}
        maskResult={riskModalState.result}
        originalText={riskModalState.originalText}
      />

      <MongoConfigModal
        isOpen={isMongoModalOpen}
        onClose={() => setIsMongoModalOpen(false)}
        systemStatus={systemStatus}
        onRefreshStatus={fetchStatusAndStats}
      />
    </div>
  );
}
