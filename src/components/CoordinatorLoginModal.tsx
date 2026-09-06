import React, { useState } from 'react';
import { Users, Mail, Lock, Eye, EyeOff, X, AlertCircle, Sparkles } from 'lucide-react';
import { coordinatorLogin } from '../services/api';
import { AuthSession } from '../types';

interface CoordinatorLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: AuthSession) => void;
}

export const CoordinatorLoginModal: React.FC<CoordinatorLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email ID is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    try {
      setLoading(true);
      const session = await coordinatorLogin(email.trim(), password);
      onLoginSuccess(session);
    } catch (err: any) {
      // Must not reveal which credential was incorrect
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuickCoordinator = (coordEmail: string) => {
    setEmail(coordEmail);
    setPassword('Coord@123');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Accent top line */}
        <div className="h-1 w-full bg-[#F27D26]" />

        <div className="p-6 sm:p-7">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#F27D26]">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                  Coordinator Login
                </h3>
                <p className="text-xs text-white/40 font-mono">
                  Assigned Event QR Scanning Access
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
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300 font-medium">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1.5">
                Email ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  id="input-coord-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="coordinator@egspec.ac.in"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#F27D26] focus:outline-none text-sm text-white placeholder-white/30"
                />
              </div>
            </div>

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
                  id="input-coord-password"
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

            <div className="pt-2">
              <button
                type="submit"
                id="btn-submit-coord-login"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-widest text-[#070707] bg-[#F27D26] hover:opacity-90 shadow-lg shadow-[#F27D26]/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Coordinator...</span>
                  </>
                ) : (
                  <span>LOGIN AS COORDINATOR</span>
                )}
              </button>
            </div>
          </form>

          {/* Initial Pre-configured Coordinators quick helper */}
          <div className="mt-5 pt-4 border-t border-white/5">
            <div className="text-[11px] text-white/40 font-mono mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#F27D26]" />
              <span>Initial Coordinators (Quick select):</span>
            </div>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleSelectQuickCoordinator('pushpa.cse@egspec.ac.in')}
                className="w-full text-left text-xs p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#F27D26]/40 transition-colors flex items-center justify-between"
              >
                <span className="text-white font-medium">Dr. G. Pushpa (AP/CSE)</span>
                <span className="text-[10px] font-mono text-[#FCD34D]">Paper Presentation</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectQuickCoordinator('mohanapriya.cse@egspec.ac.in')}
                className="w-full text-left text-xs p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#F27D26]/40 transition-colors flex items-center justify-between"
              >
                <span className="text-white font-medium">Mrs. L. Mohana Priya (AP/CSE)</span>
                <span className="text-[10px] font-mono text-[#FCD34D]">Poster Making</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectQuickCoordinator('convenor.cse@egspec.ac.in')}
                className="w-full text-left text-xs p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#F27D26]/40 transition-colors flex items-center justify-between"
              >
                <span className="text-white font-medium">Dr. K. Balasubramaniam (Head/CSE)</span>
                <span className="text-[10px] font-mono text-[#FCD34D]">Paper Presentation</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
