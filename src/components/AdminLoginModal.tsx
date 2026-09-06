import React, { useState } from 'react';
import { Shield, KeyRound, Lock, Eye, EyeOff, X, AlertCircle, Sparkles } from 'lucide-react';
import { adminLogin } from '../services/api';
import { AuthSession } from '../types';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: AuthSession) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [accessKey, setAccessKey] = useState('');
  const [adminName, setAdminName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!accessKey.trim()) {
      setError('Admin Access Key is required.');
      return;
    }
    if (!adminName.trim()) {
      setError('Admin Name is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    try {
      setLoading(true);
      const session = await adminLogin(accessKey.trim(), adminName.trim(), password);
      onLoginSuccess(session);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrefillInitialAdmin = () => {
    setAccessKey('aegis-syntronix-2026-key');
    setAdminName('Sakthinathan');
    setPassword('Aegis.CEO@03');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Top accent */}
        <div className="h-1 w-full bg-[#F27D26]" />

        <div className="p-6 sm:p-7">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#F27D26]">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                  Overall Admin Authentication
                </h3>
                <p className="text-xs text-white/40 font-mono">
                  SYNTRONIX &apos;26 • Master Security Clearance
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Step 1: Admin Access Key */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1.5">
                Admin Access Key (ADMIN_ACCESS_KEY)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  id="input-admin-access-key"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  placeholder="Enter system master access key"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#F27D26] focus:outline-none text-sm text-white placeholder-white/30 font-mono"
                  autoComplete="off"
                />
              </div>
              <p className="text-[10px] text-white/40 mt-1 font-mono">
                Project owner key configured server-side
              </p>
            </div>

            {/* Step 2: Admin Username */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1.5">
                Admin Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                  <Shield className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  id="input-admin-name"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Sakthinathan"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#F27D26] focus:outline-none text-sm text-white placeholder-white/30"
                />
              </div>
            </div>

            {/* Step 3: Password */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="input-admin-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#F27D26] focus:outline-none text-sm text-white placeholder-white/30 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/40 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-2">
              <button
                type="submit"
                id="btn-submit-admin-auth"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-widest text-[#070707] bg-[#F27D26] hover:opacity-90 shadow-lg shadow-[#F27D26]/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-[#070707]" />
                    <span>AUTHENTICATE OVERALL ADMIN</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick test prefill helper */}
          <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-[11px] text-white/40 font-mono">
              Initial Admin: Sakthinathan
            </span>
            <button
              type="button"
              onClick={handlePrefillInitialAdmin}
              className="text-[11px] font-mono text-[#F27D26] hover:opacity-80 hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>Fill Initial Credentials</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
