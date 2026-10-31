import React, { useState } from 'react';
import {
  X,
  Lock,
  User as UserIcon,
  ShieldCheck,
  Mail,
  KeyRound,
  Building,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  Fingerprint,
  Scan,
  CheckCircle2,
} from 'lucide-react';
import { User } from '../../types/index.ts';
import { api, setStoredAuth } from '../../services/api.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const res = await api.login({ email, password });
        setStoredAuth(res.token, res.user);
        onSuccess(res.user);
        onClose();
      } else {
        const res = await api.register({
          name,
          email,
          password,
          organization: organization || 'Enterprise Team',
        });
        setStoredAuth(res.token, res.user);
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoAccount = (roleType: 'admin' | 'officer') => {
    setMode('login');
    if (roleType === 'admin') {
      setEmail('admin@privyshield.io');
      setPassword('Admin@12345');
    } else {
      setEmail('compliance@privyshield.io');
      setPassword('Compliance@123');
    }
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#dff3ff] p-3 sm:p-5">
      <div className="relative flex w-full max-w-5xl min-h-[540px] flex-col md:flex-row-reverse overflow-hidden rounded-2xl border border-white/70 bg-[#080d24] shadow-2xl shadow-blue-950/30">

        {/* Login Form */}
        <div className="relative z-10 flex w-full flex-col justify-center overflow-y-auto bg-[radial-gradient(ellipse_at_25%_30%,rgba(0,220,220,0.28),transparent_48%),radial-gradient(ellipse_at_90%_100%,rgba(0,65,255,0.45),transparent_45%),linear-gradient(145deg,#071b36,#0b1028_55%,#100820)] px-6 py-8 sm:px-10 md:w-[46%] lg:px-12">

          <div className="mb-7 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/15 text-cyan-300">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">PrivyShield AI</h2>
                <p className="text-[11px] text-cyan-200/70">Data Privacy & Protection</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              {mode === 'login'
                ? "Welcome back! Access your secure privacy workspace."
                : 'Create your secure enterprise privacy account.'}
            </p>
          </div>

          <div className="mb-5 flex rounded-lg border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 rounded-md py-2.5 text-sm font-semibold transition ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); }}
              className={`flex-1 rounded-md py-2.5 text-sm font-semibold transition ${
                mode === 'register'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          {mode === 'login' && (
            <div className="mb-5 rounded-xl border border-cyan-400/25 bg-cyan-400/5 p-3">
              <p className="mb-2 text-xs font-semibold text-cyan-200">
                One-Click Demo Access
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDemoAccount('admin')}
                  className="flex-1 rounded-lg border border-cyan-300/30 bg-white/5 px-2 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-400/15"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setDemoAccount('officer')}
                  className="flex-1 rounded-lg border border-cyan-300/30 bg-white/5 px-2 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-400/15"
                >
                  Compliance Officer
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-200">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-cyan-300/70" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full rounded-lg border border-slate-500/40 bg-slate-950/50 py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-200">Organization (Optional)</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 h-4 w-4 text-cyan-300/70" />
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="Organization name"
                      className="w-full rounded-lg border border-slate-500/40 bg-slate-950/50 py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-200">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-cyan-300/70" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@enterprise.com"
                  className="w-full rounded-lg border border-slate-500/40 bg-slate-950/50 py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-200">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-cyan-300/70" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-slate-500/40 bg-slate-950/50 py-3 pl-10 pr-11 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-3 text-slate-400 transition hover:text-cyan-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Lock className="h-4 w-4" />
              {isLoading ? 'Processing...' : mode === 'login' ? 'Sign In Securely' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/15" />
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Protected Access</span>
            <div className="h-px flex-1 bg-white/15" />
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
            Secure authentication · Role-based access
          </div>
        </div>

        {/* Cybersecurity Illustration Panel */}
        <div className="relative hidden flex-1 items-center justify-center overflow-hidden border-l border-cyan-300/20 bg-[#06152d] md:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(0,190,255,0.24),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(0,70,255,0.25),transparent_40%)]" />

          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'linear-gradient(rgba(56,189,248,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,.22) 1px, transparent 1px)',
            backgroundSize: '42px 42px',
          }} />

          <div className="relative flex flex-col items-center px-8 text-center">
            <div className="relative flex h-64 w-64 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-cyan-400/20" />
              <div className="absolute inset-5 rounded-full border border-blue-400/30" />
              <div className="absolute inset-10 rounded-full border border-cyan-300/20" />
              <div className="absolute h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />

              <div className="relative flex h-36 w-36 items-center justify-center text-cyan-300 drop-shadow-[0_0_25px_rgba(0,220,255,0.8)]">
                <Shield className="absolute h-36 w-36 fill-blue-500/20 stroke-cyan-300" strokeWidth={1.2} />
                <Lock className="relative h-14 w-14 text-cyan-100 drop-shadow-[0_0_12px_rgba(0,220,255,0.9)]" strokeWidth={1.5} />
              </div>

              <div className="absolute right-5 top-10 rounded-lg border border-cyan-300/30 bg-cyan-400/10 p-2 text-cyan-200">
                <Fingerprint className="h-5 w-5" />
              </div>
              <div className="absolute bottom-10 left-3 rounded-lg border border-blue-300/30 bg-blue-400/10 p-2 text-blue-200">
                <Scan className="h-5 w-5" />
              </div>
            </div>

            <h2 className="mt-5 text-2xl font-bold text-white">
              Your Data. <span className="text-cyan-300">Protected.</span>
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">
              Detect, classify and mask sensitive information with intelligent privacy protection.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-5 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" /> Secure masking
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" /> Privacy first
              </span>
            </div>
          </div>

          <div className="absolute bottom-5 left-0 right-0 text-center text-[10px] tracking-widest text-slate-500">
            PRIVYSHIELD AI · ENTERPRISE DATA PROTECTION
          </div>
        </div>
      </div>
    </div>
  );
};
