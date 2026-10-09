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
  Calendar,
  MapPin,
  Trophy,
  ListChecks,
  Sparkles,
  Layers,
  Save,
  Check,
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
  removeDeletedCoordinatorLocal,
  isCoordinatorDeletedClient,
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

  // Edit Event state
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedCategory, setEditedCategory] = useState<string>('TECHNICAL');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedEventDate, setEditedEventDate] = useState('');
  const [editedMode, setEditedMode] = useState('');
  const [editedVenue, setEditedVenue] = useState('');
  const [editedParticipationType, setEditedParticipationType] = useState('');
  const [editedTeamSize, setEditedTeamSize] = useState('');
  const [editedRoundsCount, setEditedRoundsCount] = useState<number | string>(2);
  const [editedDuration, setEditedDuration] = useState('');
  const [editedWinningCriteria, setEditedWinningCriteria] = useState('');
  const [editedRules, setEditedRules] = useState('');
  const [editedRequirements, setEditedRequirements] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

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
      setEditedCategory(event.category || 'TECHNICAL');
      setEditedDescription(event.description || '');
      setEditedEventDate(event.eventDate || (event.category === 'ONLINE' ? 'Day 2: 14 October 2026' : 'Day 1: 10 October 2026'));
      setEditedMode(event.mode || (event.category === 'ONLINE' ? 'Fully Online' : 'Offline / In Person'));
      setEditedVenue(event.venue || (event.category === 'ONLINE' ? 'Online Article Presentation via Unstop' : 'E.G.S. Pillay Engineering College, Nagapattinam'));
      setEditedParticipationType(event.participationType || 'Team');
      setEditedTeamSize(event.teamSize || '2 Members');
      setEditedRoundsCount(event.roundsCount || (event.rounds ? event.rounds.length : 2));
      setEditedDuration(event.duration || '');
      setEditedWinningCriteria(
        Array.isArray(event.winningCriteria)
          ? event.winningCriteria.join('\n')
          : event.winningCriteria || ''
      );
      setEditedRules(Array.isArray(event.rules) ? event.rules.join('\n') : '');
      setEditedRequirements(Array.isArray(event.requirements) ? event.requirements.join('\n') : '');
      setIsEditing(false);
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

  // Handle Event details update
  const handleUpdateEventDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedName.trim()) return;
    try {
      setSavingDetails(true);
      const parsedRules = editedRules
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const parsedRequirements = editedRequirements
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const parsedCriteria = editedWinningCriteria.includes('\n')
        ? editedWinningCriteria.split('\n').map((s) => s.trim()).filter(Boolean)
        : editedWinningCriteria.trim();

      await updateEvent(event.eventId, {
        eventName: editedName.trim(),
        category: editedCategory,
        description: editedDescription.trim(),
        eventDate: editedEventDate.trim(),
        mode: editedMode.trim(),
        venue: editedVenue.trim(),
        participationType: editedParticipationType.trim(),
        teamSize: editedTeamSize.trim(),
        roundsCount: editedRoundsCount,
        duration: editedDuration.trim(),
        winningCriteria: parsedCriteria,
        rules: parsedRules,
        requirements: parsedRequirements,
      });
      setIsEditing(false);
      onEventUpdated();
    } catch (err: any) {
      alert('Failed to update event: ' + err.message);
    } finally {
      setSavingDetails(false);
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
      removeDeletedCoordinatorLocal([coordEmail.trim(), coordName.trim()]);
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
      await loadEventData();
      onEventUpdated();
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
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-white border border-white/10 flex items-center gap-1.5 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Details'}</span>
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
        {isEditing && (
          <form
            onSubmit={handleUpdateEventDetails}
            className="p-5 bg-[#0F0F0F] border-b border-white/10 space-y-4 max-h-[50vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#F27D26] uppercase flex items-center gap-1.5">
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Event Specifications & Details</span>
              </span>
              <span className="text-[11px] text-white/40 font-mono">
                {event.eventId}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-white/40 mb-1">
                  Event Name
                </label>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Event Name"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-white/40 mb-1">
                  Category
                </label>
                <select
                  value={editedCategory}
                  onChange={(e) => setEditedCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-white/10 text-xs text-white focus:outline-none focus:border-[#F27D26]"
                >
                  <option value="TECHNICAL">TECHNICAL</option>
                  <option value="NON_TECHNICAL">NON_TECHNICAL</option>
                  <option value="ONLINE">ONLINE</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-white/40 mb-1">
                  Date & Day
                </label>
                <input
                  type="text"
                  value={editedEventDate}
                  onChange={(e) => setEditedEventDate(e.target.value)}
                  placeholder="Day 1: 10 October 2026"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#F27D26]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-white/40 mb-1">
                  Mode
                </label>
                <input
                  type="text"
                  value={editedMode}
                  onChange={(e) => setEditedMode(e.target.value)}
                  placeholder="Offline / In Person or Fully Online"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-white/40 mb-1">
                  Venue / Platform
                </label>
                <input
                  type="text"
                  value={editedVenue}
                  onChange={(e) => setEditedVenue(e.target.value)}
                  placeholder="E.G.S. Pillay Engineering College, Nagapattinam"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-white/40 mb-1">
                  Participation Type & Team Size
                </label>
                <input
                  type="text"
                  value={editedParticipationType}
                  onChange={(e) => setEditedParticipationType(e.target.value)}
                  placeholder="Team of 2 / Individual"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#F27D26]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-white/40 mb-1">
                  Number of Rounds
                </label>
                <input
                  type="text"
                  value={editedRoundsCount}
                  onChange={(e) => setEditedRoundsCount(e.target.value)}
                  placeholder="2 or 3 rounds + Grand Finale"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-white/40 mb-1">
                  Duration
                </label>
                <input
                  type="text"
                  value={editedDuration}
                  onChange={(e) => setEditedDuration(e.target.value)}
                  placeholder="Round 1 — 10 seconds; Round 2 — 1 minute"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#F27D26]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-white/40 mb-1">
                Event Description
              </label>
              <textarea
                rows={2}
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Full event description..."
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#F27D26]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-white/40 mb-1">
                  Winning Criteria (Lines or Points)
                </label>
                <textarea
                  rows={3}
                  value={editedWinningCriteria}
                  onChange={(e) => setEditedWinningCriteria(e.target.value)}
                  placeholder="e.g. 10 points for completing challenge..."
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-white/40 mb-1">
                  Rules & Regulations (1 per line)
                </label>
                <textarea
                  rows={3}
                  value={editedRules}
                  onChange={(e) => setEditedRules(e.target.value)}
                  placeholder="One rule per line..."
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-white/40 mb-1">
                  Requirements & Setup (1 per line)
                </label>
                <textarea
                  rows={3}
                  value={editedRequirements}
                  onChange={(e) => setEditedRequirements(e.target.value)}
                  placeholder="One requirement per line..."
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#F27D26]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingDetails}
                className="py-2 px-5 rounded-xl text-xs font-mono font-bold text-[#070707] bg-[#F27D26] hover:opacity-90 disabled:opacity-50 transition-colors uppercase tracking-wider flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5 text-[#070707]" />
                <span>{savingDetails ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
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
              {/* Event Date, Mode & Venue Bar */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#F27D26]/10 via-[#F27D26]/5 to-transparent border border-[#F27D26]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F27D26]/15 border border-[#F27D26]/30 flex items-center justify-center text-[#F27D26]">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white font-mono">
                        {event.eventDate || (event.category === 'ONLINE' ? 'Day 2: 14 October 2026' : 'Day 1: 10 October 2026')}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/80 border border-white/10 uppercase">
                        {event.mode || (event.category === 'ONLINE' ? 'Fully Online' : 'Offline / In Person')}
                      </span>
                    </div>
                    <div className="text-xs text-white/60 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#F27D26]" />
                      <span>{event.venue || (event.category === 'ONLINE' ? 'Online Article Presentation via Unstop' : 'E.G.S. Pillay Engineering College, Nagapattinam')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono uppercase font-bold px-2.5 py-1 rounded-lg border ${
                    event.category === 'TECHNICAL'
                      ? 'bg-[#F27D26]/10 text-[#F27D26] border-[#F27D26]/30'
                      : event.category === 'ONLINE'
                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {event.category}
                  </span>
                  <span className="text-[10px] font-mono uppercase font-bold px-2.5 py-1 rounded-lg bg-white/5 text-white/60 border border-white/10">
                    Status: {event.status || 'ACTIVE'}
                  </span>
                </div>
              </div>

              {/* Fast Specs 4-Card Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] font-mono uppercase text-white/40">Participation</div>
                  <div className="text-sm font-bold text-white mt-1">
                    {event.participationType || 'Team'}
                  </div>
                  {event.teamSize && (
                    <div className="text-[10px] text-white/50 font-mono mt-0.5">{event.teamSize}</div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] font-mono uppercase text-white/40">Rounds</div>
                  <div className="text-sm font-bold text-white mt-1">
                    {event.roundsCount !== undefined ? `${event.roundsCount} Rounds` : (event.rounds ? `${event.rounds.length} Rounds` : '2 Rounds')}
                  </div>
                  <div className="text-[10px] text-white/50 font-mono mt-0.5">Competitive Stages</div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 sm:col-span-2">
                  <div className="text-[10px] font-mono uppercase text-white/40">Duration</div>
                  <div className="text-sm font-bold text-white mt-1">
                    {event.duration || 'Session Based'}
                  </div>
                  <div className="text-[10px] text-white/50 font-mono mt-0.5">Time per round / game</div>
                </div>
              </div>

              {/* Description */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <h4 className="text-xs font-mono uppercase text-[#F27D26] mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Event Description</span>
                </h4>
                <p className="text-sm text-white/80 leading-relaxed">
                  {event.description || 'No detailed description specified yet.'}
                </p>
              </div>

              {/* Structured Round-by-Round Breakdown */}
              {event.rounds && event.rounds.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase text-white/60 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#F27D26]" />
                    <span>Round-by-Round Breakdown ({event.rounds.length} Rounds)</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {event.rounds.map((rnd, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/20">
                              Round {rnd.roundNumber || idx + 1}
                            </span>
                            {rnd.duration && (
                              <span className="text-[10px] font-mono text-white/40 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{rnd.duration}</span>
                              </span>
                            )}
                          </div>
                          <h5 className="text-sm font-bold text-white font-['Space_Grotesk']">
                            {rnd.title}
                          </h5>
                          <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
                            {rnd.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Winning Criteria */}
              {event.winningCriteria && (
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <h4 className="text-xs font-mono uppercase text-[#FCD34D] mb-3 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-[#FCD34D]" />
                    <span>Winning Criteria</span>
                  </h4>
                  {Array.isArray(event.winningCriteria) ? (
                    <ul className="space-y-2">
                      {event.winningCriteria.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-white/80">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#FCD34D] mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-white/80 leading-relaxed">
                      {event.winningCriteria}
                    </p>
                  )}
                </div>
              )}

              {/* Rules & Regulations */}
              {event.rules && event.rules.length > 0 && (
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <h4 className="text-xs font-mono uppercase text-white/60 mb-3 flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5 text-[#F27D26]" />
                    <span>Rules & Regulations</span>
                  </h4>
                  <ul className="space-y-2">
                    {event.rules.map((rule, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-white/70">
                        <span className="text-[#F27D26] font-mono text-[10px] font-bold mt-0.5">
                          {idx + 1}.
                        </span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Requirements & Equipment */}
              {event.requirements && event.requirements.length > 0 && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-xs font-mono uppercase text-white/40 mb-2">
                    Requirements & Equipment
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {event.requirements.map((req, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-mono px-2.5 py-1 rounded-lg bg-white/5 text-white/70 border border-white/10"
                      >
                        • {req}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Governance & Live Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] font-mono uppercase text-white/40">
                    Total Present
                  </div>
                  <div className="text-3xl font-black text-[#F27D26] mt-2 font-['Space_Grotesk']">
                    {attendanceList.length}
                  </div>
                  <div className="text-[10px] font-mono text-white/40 mt-1">Verified Scans</div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] font-mono uppercase text-white/40">
                    Active Coordinators
                  </div>
                  <div className="text-3xl font-black text-white mt-2 font-['Space_Grotesk']">
                    {coordinators.filter((c) => c.status === 'ACTIVE').length}
                  </div>
                  <div className="text-[10px] font-mono text-white/40 mt-1">Assigned & Active</div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] font-mono uppercase text-white/40">
                    Jury Assigned
                  </div>
                  <div className="text-3xl font-black text-white mt-2 font-['Space_Grotesk']">
                    {juryList.length}
                  </div>
                  <div className="text-[10px] font-mono text-white/40 mt-1">Official Evaluators</div>
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
                    {coordinators.filter((c) => !isCoordinatorDeletedClient(c)).map((c) => {
                      const currentStatus = (c.status || 'ACTIVE').toUpperCase();
                      const isActive = currentStatus === 'ACTIVE';
                      return (
                        <tr key={c.coordinatorId} className="hover:bg-white/5">
                          <td className="py-3 px-4 font-bold text-[#F27D26]">{c.coordinatorId}</td>
                          <td className="py-3 px-4 font-sans font-medium text-white">
                            {c.coordinatorName}
                          </td>
                          <td className="py-3 px-4 text-white/60">{c.email}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isActive
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-white/5 text-white/40'
                              }`}
                            >
                              {currentStatus}
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
                      );
                    })}
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
