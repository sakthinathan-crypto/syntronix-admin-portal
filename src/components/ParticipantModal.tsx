import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, AlertCircle, Check } from 'lucide-react';
import { ParticipantRecord, SymposiumEvent } from '../types';

interface ParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    uniqueId?: string;
    name: string;
    registrationNo: string;
    college: string;
    department: string;
    email: string;
    mobile: string;
    selectedEvents: string[];
  }) => Promise<void>;
  editingParticipant: ParticipantRecord | null;
  availableEvents: SymposiumEvent[];
}

export const ParticipantModal: React.FC<ParticipantModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingParticipant,
  availableEvents,
}) => {
  const [uniqueId, setUniqueId] = useState('');
  const [name, setName] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');
  const [college, setCollege] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingParticipant) {
      setUniqueId(editingParticipant.uniqueId || '');
      setName(editingParticipant.name || '');
      setRegistrationNo(editingParticipant.registrationNo || '');
      setCollege(editingParticipant.college || '');
      setDepartment(editingParticipant.department || '');
      setEmail(editingParticipant.email || '');
      setMobile(editingParticipant.mobile || '');
      setSelectedEvents(
        Array.isArray(editingParticipant.selectedEvents)
          ? editingParticipant.selectedEvents
          : []
      );
    } else {
      setUniqueId('');
      setName('');
      setRegistrationNo('');
      setCollege('');
      setDepartment('');
      setEmail('');
      setMobile('');
      setSelectedEvents([]);
    }
    setError(null);
  }, [editingParticipant, isOpen]);

  if (!isOpen) return null;

  const toggleEvent = (eventName: string) => {
    setSelectedEvents((prev) => {
      const exists = prev.some(
        (e) => e.toLowerCase() === eventName.toLowerCase()
      );
      if (exists) {
        return prev.filter(
          (e) => e.toLowerCase() !== eventName.toLowerCase()
        );
      } else {
        return [...prev, eventName];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Participant name is required.');
      return;
    }
    if (!registrationNo.trim()) {
      setError('University Registration Number is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        uniqueId: uniqueId.trim() || undefined,
        name: name.trim(),
        registrationNo: registrationNo.trim(),
        college: college.trim(),
        department: department.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        selectedEvents,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save participant record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0A0A0A] border border-white/10 shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F27D26]/10 border border-[#F27D26]/20 flex items-center justify-center text-[#F27D26]">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">
                {editingParticipant ? 'Edit Participant Record' : 'Add New Participant'}
              </h2>
              <p className="text-xs text-white/40 font-mono">
                {editingParticipant
                  ? `Editing ${editingParticipant.uniqueId}`
                  : 'Register participant into SYNTRONIX database'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/60 mb-1 font-semibold uppercase text-[11px]">
                Unique ID (Optional)
              </label>
              <input
                type="text"
                value={uniqueId}
                onChange={(e) => setUniqueId(e.target.value)}
                placeholder="e.g. SYN26-0003"
                disabled={Boolean(editingParticipant)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#F27D26] disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-white/60 mb-1 font-semibold uppercase text-[11px]">
                Registration No <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={registrationNo}
                onChange={(e) => setRegistrationNo(e.target.value)}
                placeholder="e.g. 811321104001"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#F27D26]"
              />
            </div>
          </div>

          <div>
            <label className="block text-white/60 mb-1 font-semibold uppercase text-[11px]">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#F27D26]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/60 mb-1 font-semibold uppercase text-[11px]">
                College / Institution
              </label>
              <input
                type="text"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="e.g. E.G.S. Pillay Engineering College"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#F27D26]"
              />
            </div>

            <div>
              <label className="block text-white/60 mb-1 font-semibold uppercase text-[11px]">
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. CSE / IT / ECE"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#F27D26]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/60 mb-1 font-semibold uppercase text-[11px]">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. participant@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#F27D26]"
              />
            </div>

            <div>
              <label className="block text-white/60 mb-1 font-semibold uppercase text-[11px]">
                Mobile Number
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#F27D26]"
              />
            </div>
          </div>

          <div>
            <label className="block text-white/60 mb-2 font-semibold uppercase text-[11px]">
              Registered Events (Eligible for Scanning)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 rounded-xl bg-white/5 border border-white/10">
              {availableEvents.map((ev) => {
                const isChecked = selectedEvents.some(
                  (s) => s.toLowerCase() === ev.eventName.toLowerCase()
                );
                return (
                  <button
                    type="button"
                    key={ev.eventId}
                    onClick={() => toggleEvent(ev.eventName)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-xs font-mono ${
                      isChecked
                        ? 'bg-[#F27D26]/20 border border-[#F27D26]/40 text-white'
                        : 'bg-white/5 hover:bg-white/10 text-white/60 border border-transparent'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                        isChecked
                          ? 'bg-[#F27D26] border-[#F27D26] text-[#070707]'
                          : 'border-white/20'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">{ev.eventName}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-white/40 mt-1.5">
              Select all events this participant is registered to attend.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors font-mono"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl font-bold text-[#070707] bg-[#F27D26] hover:opacity-90 active:scale-95 shadow-lg shadow-[#F27D26]/20 transition-all font-mono flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : editingParticipant ? 'Update Participant' : 'Save Participant'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
