import React, { useState } from 'react';
import { RotateCcw, AlertTriangle, X, Shield, CheckCircle2 } from 'lucide-react';
import { resetAttendance } from '../services/api';

interface ResetAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminName: string;
  initialUniqueId?: string;
  initialEvent?: string;
  onResetSuccess: () => void;
}

export const ResetAttendanceModal: React.FC<ResetAttendanceModalProps> = ({
  isOpen,
  onClose,
  adminName,
  initialUniqueId = '',
  initialEvent = '',
  onResetSuccess,
}) => {
  const [uniqueId, setUniqueId] = useState(initialUniqueId);
  const [event, setEvent] = useState(initialEvent);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!uniqueId.trim()) {
      setError('Unique Participant ID is required.');
      return;
    }
    if (!event.trim()) {
      setError('Event name is required.');
      return;
    }
    if (!reason.trim()) {
      setError('A valid administrative reason is required for audit logging.');
      return;
    }

    try {
      setLoading(true);
      const res = await resetAttendance(uniqueId.trim(), event.trim(), adminName, reason.trim());
      setSuccessMsg(res.message);
      setTimeout(() => {
        onResetSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset attendance record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-1 w-full bg-red-500" />

        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Reset QR Attendance State
                </h3>
                <p className="text-[11px] text-white/40 font-mono">
                  Overall Admin Authority Only
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

          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>
              This operation will permanently remove the attendance record for this specific event and permit the participant to be scanned again. All resets are logged into QR RESET LOGS.
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-mono uppercase text-white/40 mb-1">
                Unique Participant ID
              </label>
              <input
                type="text"
                value={uniqueId}
                onChange={(e) => setUniqueId(e.target.value)}
                placeholder="SYN26-0001"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-[#F27D26] text-xs font-mono text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-white/40 mb-1">
                Event Name
              </label>
              <input
                type="text"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                placeholder="Paper Presentation"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-[#F27D26] text-xs font-mono text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-white/40 mb-1">
                Admin Name (Audit Attribution)
              </label>
              <input
                type="text"
                value={adminName}
                readOnly
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white/40 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-white/40 mb-1">
                Reason for Reset
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Accidental scan at wrong desk, participant transferred slot"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-[#F27D26] text-xs text-white focus:outline-none"
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-mono text-white/40 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {loading ? 'Processing...' : 'CONFIRM RESET'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
