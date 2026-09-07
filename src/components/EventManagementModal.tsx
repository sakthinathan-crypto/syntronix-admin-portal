import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Users,
  Award,
  CalendarCheck,
  BarChart3,
  Edit2,
  Trash2,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  SymposiumEvent,
  CoordinatorUser,
  JuryMember,
  AttendanceRecord,
} from '../types';
import {
  getCoordinators,
  addCoordinator,
  deleteCoordinator,
  deactivateCoordinator,
  getJury,
  addJury,
  deactivateJury,
  getAttendance,
  updateEvent,
} from '../services/api';

interface EventManagementModalProps {
  isOpen: boolean;
  event: SymposiumEvent | null;
  onClose: () => void;
  onEventUpdated: () => void;
}

export const EventManagementModal: React.FC<EventManagementModalProps> = ({
  isOpen,
  event,
  onClose,
  onEventUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'coordinators' | 'jury' | 'attendance' | 'statistics'
  >('overview');

  const [coordinators, setCoordinators] = useState<CoordinatorUser[]>([]);
  const [juryList, setJuryList] = useState<JuryMember[]>([]);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit Event Name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  // Add Coordinator state
  const [showAddCoord, setShowAddCoord] = useState(false);
  const [coordName, setCoordName] = useState('');
  const [coordEmail, setCoordEmail] = useState('');
  const [coordPassword, setCoordPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [coordError, setCoordError] = useState<string | null>(null);

  // Add Jury state
  const [showAddJury, setShowAddJury] = useState(false);
  const [juryName, setJuryName] = useState('');
  const [juryError, setJuryError] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      setEditedName(event.eventName);
      setEditedDescription(event.description || '');
      loadEventData();
    }
  }, [event]);

  const loadEventData = async () => {
    if (!event) return;
    try {
      setLoading(true);
      const [coords, juries, atts] = await Promise.all([
        getCoordinators(event.eventName),
        getJury(event.eventName),
        getAttendance(event.eventName),
      ]);
      setCoordinators(coords);
      setJuryList(juries);
      setAttendanceList(atts);
    } catch (err) {
      console.error('Failed to load event details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !event) return null;

  // Handle Event Name update (useful for the 3 placeholder non-technical events)
  const handleUpdateEventDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedName.trim()) return;
    try {
      await updateEvent(event.eventId, {
        eventName: editedName.trim(),
        description: editedDescription.trim(),
      });
      setIsEditingName(false);
      onEventUpdated();
    } catch (err: any) {
      alert('Failed to update event: ' + err.message);
    }
  };

  // Handle "+ ADD COORDINATOR"
  const handleSaveCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    setCoordError(null);
    if (!coordName.trim() || !coordEmail.trim() || !coordPassword.trim()) {
      setCoordError('All fields are required.');
      return;
    }

    try {
      await addCoordinator({
        coordinatorName: coordName.trim(),
        email: coordEmail.trim(),
        password: coordPassword,
        assignedEvent: event.eventName,
      });
      // Reset form and reload
      setCoordName('');
      setCoordEmail('');
      setCoordPassword('');
      setShowAddCoord(false);
      loadEventData();
    } catch (err: any) {
      setCoordError(err.message || 'Failed to add coordinator');
    }
  };

  const handleDeleteCoordinator = async (coord: CoordinatorUser) => {
    if (!confirm('Are you sure you want to delete this coordinator?')) return;
    try {
      const res = await deleteCoordinator(coord.email, coord.coordinatorId);
      alert(res.message || 'Coordinator deleted successfully.');
      loadEventData();
      onEventUpdated();
    } catch (err: any) {
      alert('Error deleting coordinator: ' + err.message);
    }
  };

  const handleDeactivateCoordinator = async (coordId: string) => {
    if (!confirm('Are you sure you want to deactivate this coordinator?')) return;
    try {
      await deactivateCoordinator(coordId);
      loadEventData();
    } catch (err: any) {
      alert('Error deactivating coordinator: ' + err.message);
    }
  };

  // Handle "+ ADD JURY"
  const handleSaveJury = async (e: React.FormEvent) => {
    e.preventDefault();
    setJuryError(null);
    if (!juryName.trim()) {
      setJuryError('Jury name is required.');
      return;
    }

    try {
      await addJury({
        juryName: juryName.trim(),
        event: event.eventName,
      });
      setJuryName('');
      setShowAddJury(false);
      loadEventData();
    } catch (err: any) {
      setJuryError(err.message || 'Failed to add jury member');
    }
  };

  const handleDeactivateJury = async (juryId: string) => {
    if (!confirm('Are you sure you want to deactivate this jury member?')) return;
    try {
      await deactivateJury(juryId);
      loadEventData();
    } catch (err: any) {
      alert('Error deactivating jury: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top accent */}
        <div className="h-1 w-full bg-[#F27D26]" />

        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-[#0A0A0A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/20">
                {event.category}
              </span>
              <span className="text-xs text-white/40 font-mono">{event.eventId}</span>
              {event.isPlaceholder && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FCD34D]/10 text-[#FCD34D] border border-[#FCD34D]/20">
                  Placeholder (Editable)
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black text-white font-['Space_Grotesk'] tracking-tight mt-1">
              {event.eventName}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditingName(!isEditingName)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-white border border-white/10 flex items-center gap-1.5 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Edit Details</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Edit Event Details Drawer/Bar */}
        {isEditingName && (
          <form
            onSubmit={handleUpdateEventDetails}
            className="p-4 bg-white/5 border-b border-white/10 flex flex-col sm:flex-row gap-3 items-center"
          >
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              placeholder="Event Name (e.g. Web Designing, Coding Duel)"
              className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#F27D26]"
            />
            <input
              type="text"
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              placeholder="Description"
              className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#F27D26]"
            />
            <button
              type="submit"
              className="py-2 px-4 rounded-xl text-xs font-mono font-bold text-[#070707] bg-[#F27D26] hover:opacity-90 transition-colors uppercase tracking-wider"
            >
              Save Changes
            </button>
          </form>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-white/10 bg-[#070707] flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 text-xs font-mono font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-[#F27D26] text-[#F27D26]'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('coordinators')}
            className={`py-3 px-3 text-xs font-mono font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'coordinators'
                ? 'border-[#F27D26] text-[#F27D26]'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Coordinators ({coordinators.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('jury')}
            className={`py-3 px-3 text-xs font-mono font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'jury'
                ? 'border-[#F27D26] text-[#F27D26]'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Jury Members ({juryList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-3 px-3 text-xs font-mono font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'attendance'
                ? 'border-[#F27D26] text-[#F27D26]'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Attendance ({attendanceList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`py-3 px-3 text-xs font-mono font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'statistics'
                ? 'border-[#F27D26] text-[#F27D26]'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Statistics</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <h4 className="text-xs font-mono uppercase text-white/40 mb-2">
                  Event Description & Guidelines
                </h4>
                <p className="text-sm text-white/80 leading-relaxed">
                  {event.description || 'No detailed description specified yet.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] font-mono uppercase text-white/40">
                    Total Present
                  </div>
                  <div className="text-3xl font-black text-[#F27D26] mt-2 font-['Space_Grotesk']">
                    {attendanceList.length}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] font-mono uppercase text-white/40">
                    Active Coordinators
                  </div>
                  <div className="text-3xl font-black text-white mt-2 font-['Space_Grotesk']">
                    {coordinators.filter((c) => c.status === 'ACTIVE').length}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] font-mono uppercase text-white/40">
                    Jury Assigned
                  </div>
                  <div className="text-3xl font-black text-white mt-2 font-['Space_Grotesk']">
                    {juryList.length}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COORDINATORS (With unlimited "+ ADD COORDINATOR") */}
          {activeTab === 'coordinators' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white font-['Space_Grotesk']">
                    Event Coordinators
                  </h4>
                  <p className="text-xs text-white/40 font-mono">
                    Any assigned coordinator can scan participants for {event.eventName}.
                  </p>
                </div>

                {/* Clearly visible "+ ADD COORDINATOR" button */}
                <button
                  id="btn-add-coordinator"
                  onClick={() => setShowAddCoord(true)}
                  className="py-2.5 px-4 rounded-xl font-mono text-xs font-bold text-[#070707] bg-[#F27D26] hover:opacity-90 shadow-lg shadow-[#F27D26]/20 active:scale-95 transition-all flex items-center gap-1.5 uppercase tracking-wider"
                >
                  <Plus className="w-4 h-4 text-[#070707]" />
                  <span>+ ADD COORDINATOR</span>
                </button>
              </div>

              {showAddCoord && (
                <form
                  onSubmit={handleSaveCoordinator}
                  className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4 animate-in fade-in duration-200"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-mono font-bold text-[#F27D26] uppercase">
                      Register New Coordinator for {event.eventName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddCoord(false)}
                      className="text-white/40 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {coordError && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                      {coordError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-white/40 mb-1">
                        Coordinator Name
                      </label>
                      <input
                        type="text"
                        value={coordName}
                        onChange={(e) => setCoordName(e.target.value)}
                        placeholder="e.g. Sakthi"
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-[#F27D26] text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-white/40 mb-1">
                        Email ID
                      </label>
                      <input
                        type="email"
                        value={coordEmail}
                        onChange={(e) => setCoordEmail(e.target.value)}
                        placeholder="example@email.com"
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-[#F27D26] text-xs text-white focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-white/40 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={coordPassword}
                          onChange={(e) => setCoordPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 pr-9 rounded-xl bg-white/5 border border-white/10 focus:border-[#F27D26] text-xs text-white focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddCoord(false)}
                      className="px-3.5 py-2 rounded-xl text-xs font-mono text-white/40 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl font-mono text-xs font-bold text-[#070707] bg-[#F27D26] hover:opacity-90 transition-colors uppercase tracking-wider"
                    >
                      SAVE COORDINATOR
                    </button>
                  </div>
                </form>
              )}

              {/* Coordinator List Table */}
              <div className="rounded-2xl border border-white/10 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-white/40 font-mono uppercase text-[10px] border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4">Coordinator ID</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {coordinators.map((c) => (
                      <tr key={c.coordinatorId} className="hover:bg-white/5">
                        <td className="py-3 px-4 font-bold text-[#F27D26]">{c.coordinatorId}</td>
                        <td className="py-3 px-4 font-sans font-medium text-white">
                          {c.coordinatorName}
                        </td>
                        <td className="py-3 px-4 text-white/60">{c.email}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              c.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-white/5 text-white/40'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteCoordinator(c)}
                            className="px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-colors inline-flex items-center gap-1"
                            title="Delete Coordinator"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>DELETE</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {coordinators.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-white/40 font-mono">
                          No coordinators currently assigned to this event. Click &quot;+ ADD COORDINATOR&quot; above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: JURY (With "+ ADD JURY") */}
          {activeTab === 'jury' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white font-['Space_Grotesk']">
                    Jury Members
                  </h4>
                  <p className="text-xs text-white/40 font-mono">
                    Distinguished evaluators and judges for {event.eventName}.
                  </p>
                </div>

                <button
                  id="btn-add-jury"
                  onClick={() => setShowAddJury(true)}
                  className="py-2.5 px-4 rounded-xl font-mono text-xs font-bold text-[#070707] bg-[#F27D26] hover:opacity-90 shadow-lg shadow-[#F27D26]/20 active:scale-95 transition-all flex items-center gap-1.5 uppercase tracking-wider"
                >
                  <Plus className="w-4 h-4 text-[#070707]" />
                  <span>+ ADD JURY</span>
                </button>
              </div>

              {showAddJury && (
                <form
                  onSubmit={handleSaveJury}
                  className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4 animate-in fade-in duration-200"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-mono font-bold text-[#F27D26] uppercase">
                      Add Jury Member
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddJury(false)}
                      className="text-white/40 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {juryError && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                      {juryError}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-white/40 mb-1">
                      Jury Member Name & Title
                    </label>
                    <input
                      type="text"
                      value={juryName}
                      onChange={(e) => setJuryName(e.target.value)}
                      placeholder="e.g. Dr. A. Ramesh, Principal Scientist"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-[#F27D26] text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddJury(false)}
                      className="px-3.5 py-2 rounded-xl text-xs font-mono text-white/40 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl font-mono text-xs font-bold text-[#070707] bg-[#F27D26] hover:opacity-90 transition-colors uppercase tracking-wider"
                    >
                      SAVE JURY
                    </button>
                  </div>
                </form>
              )}

              <div className="rounded-2xl border border-white/10 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-white/40 font-mono uppercase text-[10px] border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4">Jury ID</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {juryList.map((j) => (
                      <tr key={j.juryId} className="hover:bg-white/5">
                        <td className="py-3 px-4 font-bold text-[#F27D26]">{j.juryId}</td>
                        <td className="py-3 px-4 font-sans font-medium text-white">
                          {j.juryName}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              j.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-white/5 text-white/40'
                            }`}
                          >
                            {j.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {j.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleDeactivateJury(j.juryId)}
                              className="text-white/40 hover:text-red-400 text-xs font-mono transition-colors"
                            >
                              Deactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {juryList.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-white/40 font-mono">
                          No jury members assigned yet. Click &quot;+ ADD JURY&quot; above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-white/40">
                  Total Marked: <strong className="text-[#F27D26]">{attendanceList.length}</strong>
                </span>
              </div>

              <div className="rounded-2xl border border-white/10 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-white/40 font-mono uppercase text-[10px] border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4">Unique ID</th>
                      <th className="py-3 px-4">Participant Name</th>
                      <th className="py-3 px-4">College</th>
                      <th className="py-3 px-4">Coordinator</th>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {attendanceList.map((a, i) => (
                      <tr key={i} className="hover:bg-white/5">
                        <td className="py-3 px-4 font-bold text-[#F27D26]">{a.uniqueId}</td>
                        <td className="py-3 px-4 font-sans text-white">{a.participantName}</td>
                        <td className="py-3 px-4 text-white/60 truncate max-w-[160px]">{a.collegeName}</td>
                        <td className="py-3 px-4 text-white/80">{a.coordinatorName}</td>
                        <td className="py-3 px-4 text-white/40">{a.attendanceTime}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {a.attendanceStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {attendanceList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-white/40 font-mono">
                          No participants marked for this event yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: STATISTICS */}
          {activeTab === 'statistics' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h4 className="text-xs font-mono uppercase text-white/40 mb-4">
                  Participation Metrics
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-white/80">Verified Attendance</span>
                      <span className="text-[#F27D26] font-bold">{attendanceList.length}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-[#F27D26] rounded-full"
                        style={{ width: `${Math.min(100, attendanceList.length * 4)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
