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
  CheckCircle,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-blue-200" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {mode === 'login' ? 'Sign In to PrivyShield AI' : 'Create Enterprise Account'}
              </h3>
              <p className="text-[11px] text-slate-500">Role-Based Access Control</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex p-1 bg-slate-100 rounded-lg text-xs font-semibold">
          <button
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-md transition-colors cursor-pointer ${
              mode === 'login' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-md transition-colors cursor-pointer ${
              mode === 'register' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Register
          </button>
        </div>

        {/* Quick Demo Credentials */}
        <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-lg text-xs space-y-2">
          <span className="text-[11px] font-bold text-blue-900 block">
            One-Click Demo Credentials:
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDemoAccount('admin')}
              className="flex-1 py-1 px-2 bg-white hover:bg-blue-100/60 text-blue-800 border border-blue-200 rounded text-[11px] font-semibold text-center cursor-pointer transition-colors"
            >
              Admin (Full Control)
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('officer')}
              className="flex-1 py-1 px-2 bg-white hover:bg-blue-100/60 text-blue-800 border border-blue-200 rounded text-[11px] font-semibold text-center cursor-pointer transition-colors"
            >
              Compliance Officer
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {mode === 'register' && (
            <>
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rachel Adams"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
<div className="space-y-1">
                <label className="block font-semibold text-slate-700">Organization (Optional)</label>
                <div className="relative">
                  <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. FinTech Global Security"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="block font-semibold text-slate-700">Work Email</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@enterprise.com"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block font-semibold text-slate-700">Password</label>
            <div className="relative">
              <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            {isLoading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};


