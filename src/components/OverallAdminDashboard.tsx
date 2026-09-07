import React, { useState, useEffect } from 'react';
import {
  Users,
  CalendarCheck,
  Shield,
  Layers,
  BarChart3,
  Clock,
  Search,
  Filter,
  Download,
  RotateCcw,
  Plus,
  RefreshCw,
  School,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Award,
  Trash2,
} from 'lucide-react';
import {
  AdminStats,
  SymposiumEvent,
  AttendanceRecord,
  CoordinatorUser,
  ScanLog,
  ResetLog,
  AuthSession,
} from '../types';
import {
  getAdminStats,
  getEvents,
  getAttendance,
  getCoordinators,
  getScanLogs,
  getResetLogs,
  deleteCoordinator,
} from '../services/api';
import { EventManagementModal } from './EventManagementModal';
import { ResetAttendanceModal } from './ResetAttendanceModal';

interface OverallAdminDashboardProps {
  session: AuthSession;
  onOpenSettings: () => void;
}

export const OverallAdminDashboard: React.FC<OverallAdminDashboardProps> = ({
  session,
  onOpenSettings,
}) => {
  const adminName = session.user.name;

  const [activeTab, setActiveTab] = useState<
    'overview' | 'events' | 'attendance' | 'coordinators' | 'scan_logs' | 'reset_logs'
  >('overview');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [events, setEvents] = useState<SymposiumEvent[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [coordinators, setCoordinators] = useState<CoordinatorUser[]>([]);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [resetLogs, setResetLogs] = useState<ResetLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Selected event for modal
  const [selectedEvent, setSelectedEvent] = useState<SymposiumEvent | null>(null);

  // Reset modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetInitialId, setResetInitialId] = useState('');
  const [resetInitialEvent, setResetInitialEvent] = useState('');

  // Attendance search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterEvent, setSelectedFilterEvent] = useState('ALL');

  // Coordinator Delete States
  const [coordinatorToDelete, setCoordinatorToDelete] = useState<CoordinatorUser | null>(null);
  const [deletingCoord, setDeletingCoord] = useState(false);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  const handleConfirmDeleteCoordinator = async () => {
    if (!coordinatorToDelete) return;
    try {
      setDeletingCoord(true);
      setDeleteErrorMessage(null);
      const res = await deleteCoordinator(coordinatorToDelete.email, coordinatorToDelete.coordinatorId);
      setDeleteSuccessMessage(res.message || 'Coordinator deleted successfully.');
      setCoordinatorToDelete(null);
      await loadAllData();
      setTimeout(() => {
        setDeleteSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      setDeleteErrorMessage(err.message || 'Failed to delete coordinator');
    } finally {
      setDeletingCoord(false);
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [st, ev, att, coords, sLogs, rLogs] = await Promise.all([
        getAdminStats(),
        getEvents(),
        getAttendance(),
        getCoordinators(),
        getScanLogs(),
        getResetLogs(),
      ]);
      setStats(st);
      setEvents(ev);
      setAttendance(att);
      setCoordinators(coords);
      setScanLogs(sLogs);
      setResetLogs(rLogs);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filtered attendance records
  const filteredAttendance = attendance.filter((rec) => {
    const matchesEvent = selectedFilterEvent === 'ALL' || rec.scannedEvent === selectedFilterEvent;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      rec.uniqueId.toLowerCase().includes(q) ||
      rec.participantName.toLowerCase().includes(q) ||
      rec.collegeName.toLowerCase().includes(q) ||
      rec.universityRegNumber.toLowerCase().includes(q) ||
      rec.coordinatorName.toLowerCase().includes(q);

    return matchesEvent && matchesQuery;
  });

  // Calculate College-wise breakdown
  const collegeBreakdown = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of attendance) {
      const col = a.collegeName || 'Other Institutions';
      map[col] = (map[col] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [attendance]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredAttendance.length === 0) return;
    const headers = [
      'Timestamp',
      'Unique ID',
      'Participant Name',
      'Reg Number',
      'College',
      'Event',
      'Coordinator',
      'Attendance Time',
      'Status',
    ];
    const rows = filteredAttendance.map((r) => [
      r.timestamp,
      r.uniqueId,
      r.participantName,
      r.universityRegNumber,
      r.collegeName,
      r.scannedEvent,
      r.coordinatorName,
      r.attendanceTime,
      r.attendanceStatus,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SYNTRONIX26_Full_Attendance_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenResetForRecord = (uniqueId: string, eventName: string) => {
    setResetInitialId(uniqueId);
    setResetInitialEvent(eventName);
    setIsResetModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0A0A0A] border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#F27D26] blur-[100px] opacity-15 pointer-events-none rounded-full" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs font-mono mb-2">
              <Shield className="w-3.5 h-3.5 text-[#F27D26]" />
              <span className="uppercase tracking-wider text-[11px]">Overall Administration Control Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight">
              Symposium Command Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-white/40 font-mono mt-1">
              Welcome, <span className="text-[#F27D26] font-semibold">{adminName}</span> • Real-time symposium oversight & governance
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setResetInitialId('');
                setResetInitialEvent('');
                setIsResetModalOpen(true);
              }}
              className="py-2.5 px-4 rounded-xl text-xs font-mono font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET QR STATE</span>
            </button>

            <button
              onClick={loadAllData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#F27D26]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 border-b border-white/5 bg-[#0A0A0A] p-2 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-4 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-[#F27D26] text-[#070707] font-bold shadow-md shadow-[#F27D26]/20'
              : 'text-white/40 hover:text-white/80 hover:bg-white/5'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Overview & Stats</span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`py-2 px-4 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'events'
              ? 'bg-[#F27D26] text-[#070707] font-bold shadow-md shadow-[#F27D26]/20'
              : 'text-white/40 hover:text-white/80 hover:bg-white/5'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Event Management ({events.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`py-2 px-4 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'attendance'
              ? 'bg-[#F27D26] text-[#070707] font-bold shadow-md shadow-[#F27D26]/20'
              : 'text-white/40 hover:text-white/80 hover:bg-white/5'
          }`}
        >
          <CalendarCheck className="w-3.5 h-3.5" />
          <span>Attendance Registry ({attendance.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('coordinators')}
          className={`py-2 px-4 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'coordinators'
              ? 'bg-[#F27D26] text-[#070707] font-bold shadow-md shadow-[#F27D26]/20'
              : 'text-white/40 hover:text-white/80 hover:bg-white/5'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Coordinators ({coordinators.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('scan_logs')}
          className={`py-2 px-4 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'scan_logs'
              ? 'bg-[#F27D26] text-[#070707] font-bold shadow-md shadow-[#F27D26]/20'
              : 'text-white/40 hover:text-white/80 hover:bg-white/5'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Scan Audit Logs ({scanLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reset_logs')}
          className={`py-2 px-4 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'reset_logs'
              ? 'bg-[#F27D26] text-[#070707] font-bold shadow-md shadow-[#F27D26]/20'
              : 'text-white/40 hover:text-white/80 hover:bg-white/5'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>QR Reset Logs ({resetLogs.length})</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* SUBVIEW 1: OVERVIEW & STATS */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Top 4 Dashboard Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-white/40 tracking-wider">
                  Total Participants
                </span>
                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-white font-['Space_Grotesk'] mt-3">
                {stats?.totalParticipants || 0}
              </div>
              <p className="text-[11px] text-white/40 font-mono mt-1">Unique student IDs</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-white/40 tracking-wider">
                  Total Attendance
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CalendarCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-emerald-400 font-['Space_Grotesk'] mt-3">
                {stats?.totalAttendance || 0}
              </div>
              <p className="text-[11px] text-white/40 font-mono mt-1">
                Verified event attendances
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-white/40 tracking-wider">
                  Active Coordinators
                </span>
                <div className="w-9 h-9 rounded-xl bg-[#F27D26]/10 border border-[#F27D26]/20 flex items-center justify-center text-[#F27D26]">
                  <Shield className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-[#F27D26] font-['Space_Grotesk'] mt-3">
                {stats?.activeCoordinators || 0}
              </div>
              <p className="text-[11px] text-white/40 font-mono mt-1">Across technical & non-tech</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-white/40 tracking-wider">
                  Total Events
                </span>
                <div className="w-9 h-9 rounded-xl bg-[#FCD34D]/10 border border-[#FCD34D]/20 flex items-center justify-center text-[#FCD34D]">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-[#FCD34D] font-['Space_Grotesk'] mt-3">
                {stats?.totalEvents || 5}
              </div>
              <p className="text-[11px] text-white/40 font-mono mt-1">
                2 Technical + 3 Non-Technical
              </p>
            </div>
          </div>

          {/* Event-wise Attendance Statistics & Recent Scans */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Event-wise Attendance List (2 Cols) */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0A0A0A] border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                    Event-wise Attendance Statistics
                  </h3>
                  <p className="text-xs text-white/40 font-mono">
                    Live scan distribution across all symposium disciplines
                  </p>
                </div>
                <span className="text-xs font-mono text-[#F27D26] font-bold">
                  Total: {stats?.totalAttendance || 0}
                </span>
              </div>

              <div className="space-y-4">
                {stats?.eventWiseAttendance &&
                  (() => {
                    const maxVal = Math.max(
                      ...stats.eventWiseAttendance.map((e) => e.count),
                      1
                    );
                    return stats.eventWiseAttendance.map((item, idx) => {
                      const pct = Math.round((item.count / maxVal) * 100);
                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-white/5 border border-white/5"
                        >
                          <div className="flex items-center justify-between text-xs font-mono mb-2">
                            <span className="text-white font-medium">
                              {item.eventName}
                            </span>
                            <span className="text-[#F27D26] font-bold text-sm">
                              {item.count}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-[#F27D26] rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
              </div>
            </div>

            {/* Recent Scans (1 Col) */}
            <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/10 shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-[#F27D26]" />
                  <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                    Recent Scans
                  </h3>
                </div>

                <div className="divide-y divide-white/5">
                  {stats?.recentScans && stats.recentScans.length > 0 ? (
                    stats.recentScans.slice(0, 6).map((scan, i) => (
                      <div key={i} className="py-2.5 flex items-center justify-between text-xs font-mono">
                        <div>
                          <span className="font-bold text-white">{scan.uniqueId}</span>
                          <span className="text-[10px] text-white/40 block truncate max-w-[140px]">
                            {scan.scannedEvent}
                          </span>
                        </div>
                        <span className="text-white/40 text-[11px]">{scan.attendanceTime}</span>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-white/40 font-mono">
                      No scans logged yet today.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 mt-4">
                <button
                  onClick={() => setActiveTab('scan_logs')}
                  className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-[#F27D26] border border-white/10 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>View All Scan Logs</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* College-wise Attendance Breakdown */}
          <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/10 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <School className="w-4 h-4 text-[#F27D26]" />
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Institution-wise Distribution
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {collegeBreakdown.map(([colName, count], i) => (
                <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <span className="text-xs text-white/80 truncate mr-2" title={colName}>
                    {colName}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#FCD34D] px-2 py-0.5 rounded bg-white/5">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBVIEW 2: EVENT MANAGEMENT */}
      {/* ============================================================ */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                Symposium Events Directory
              </h3>
              <p className="text-xs text-white/40 font-mono">
                Click any event card to open its dedicated management console (Coordinators, Jury, Attendance, Stats).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((ev) => {
              const eventCoords = coordinators.filter((c) => c.assignedEvent === ev.eventName);
              const eventAttCount = attendance.filter((a) => a.scannedEvent === ev.eventName).length;

              return (
                <div
                  key={ev.eventId}
                  onClick={() => setSelectedEvent(ev)}
                  className="group cursor-pointer p-6 rounded-2xl bg-[#0A0A0A] border border-white/10 hover:border-[#F27D26]/40 shadow-2xl transition-all duration-200 hover:-translate-y-1 relative flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/5 text-[#F27D26] border border-white/10">
                        {ev.category}
                      </span>
                      <span className="text-xs font-mono text-white/40">{ev.eventId}</span>
                    </div>

                    <h4 className="text-lg font-bold text-white font-['Space_Grotesk'] group-hover:text-[#F27D26] transition-colors">
                      {ev.eventName}
                    </h4>
                    <p className="text-xs text-white/50 line-clamp-2 mt-1.5 leading-relaxed">
                      {ev.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-5 mt-5 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-3">
                      <span className="text-white/40">
                        Coordinators: <strong className="text-white">{eventCoords.length}</strong>
                      </span>
                      <span className="text-white/40">
                        Present: <strong className="text-[#F27D26]">{eventAttCount}</strong>
                      </span>
                    </div>

                    <span className="text-[#F27D26] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span>Manage</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBVIEW 3: ATTENDANCE REGISTRY */}
      {/* ============================================================ */}
      {activeTab === 'attendance' && (
        <div className="rounded-2xl bg-[#0A0A0A] border border-white/10 p-6 shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Search input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Unique ID, name, reg no, college..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#F27D26] font-mono"
              />
            </div>

            <div className="flex items-center gap-3">
              {/* Event filter dropdown */}
              <select
                value={selectedFilterEvent}
                onChange={(e) => setSelectedFilterEvent(e.target.value)}
                className="py-2.5 px-3 rounded-xl bg-[#0A0A0A] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#F27D26]"
              >
                <option value="ALL">All Events ({attendance.length})</option>
                {events.map((e) => (
                  <option key={e.eventId} value={e.eventName}>
                    {e.eventName}
                  </option>
                ))}
              </select>

              {/* Export CSV */}
              <button
                onClick={handleExportCSV}
                disabled={filteredAttendance.length === 0}
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white hover:text-[#F27D26] flex items-center gap-2 transition-colors disabled:opacity-40"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-white/40 font-mono uppercase text-[10px] border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Unique ID</th>
                  <th className="py-3 px-4">Participant Name</th>
                  <th className="py-3 px-4">University Reg No</th>
                  <th className="py-3 px-4">College</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Coordinator</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {filteredAttendance.map((rec, i) => (
                  <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#F27D26]">{rec.uniqueId}</td>
                    <td className="py-3 px-4 font-sans font-medium text-white">
                      {rec.participantName}
                    </td>
                    <td className="py-3 px-4 text-white/50">{rec.universityRegNumber || '—'}</td>
                    <td className="py-3 px-4 text-white/50 truncate max-w-[180px]" title={rec.collegeName}>
                      {rec.collegeName || '—'}
                    </td>
                    <td className="py-3 px-4 text-white font-semibold">{rec.scannedEvent}</td>
                    <td className="py-3 px-4 text-white/50">{rec.coordinatorName}</td>
                    <td className="py-3 px-4 text-white/40">{rec.attendanceTime}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {rec.attendanceStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenResetForRecord(rec.uniqueId, rec.scannedEvent)}
                        className="text-white/40 hover:text-red-400 text-xs font-mono flex items-center gap-1 ml-auto"
                        title="Reset QR Attendance state for this participant"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredAttendance.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-white/40 font-mono">
                      No attendance records match your search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBVIEW 4: COORDINATORS ROSTER */}
      {/* ============================================================ */}
      {activeTab === 'coordinators' && (
        <div className="rounded-2xl bg-[#0A0A0A] border border-white/10 p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Global Coordinators Roster
              </h3>
              <p className="text-xs text-white/40 font-mono">
                Total Registered Staff: {coordinators.length}
              </p>
            </div>
          </div>

          {deleteSuccessMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{deleteSuccessMessage}</span>
              </div>
              <button
                onClick={() => setDeleteSuccessMessage(null)}
                className="text-white/40 hover:text-white"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-white/40 font-mono uppercase text-[10px] border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Assigned Event</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {coordinators.map((c) => (
                  <tr key={c.coordinatorId} className="hover:bg-white/[0.03]">
                    <td className="py-3 px-4 font-bold text-[#F27D26]">{c.coordinatorId}</td>
                    <td className="py-3 px-4 font-sans font-medium text-white">
                      {c.coordinatorName}
                    </td>
                    <td className="py-3 px-4 text-white/50">{c.email}</td>
                    <td className="py-3 px-4 text-white font-semibold">{c.assignedEvent}</td>
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
                        id={`btn-delete-${c.coordinatorId}`}
                        onClick={() => {
                          setDeleteErrorMessage(null);
                          setCoordinatorToDelete(c);
                        }}
                        className="px-3 py-1.5 rounded-lg font-mono text-[11px] font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-colors inline-flex items-center gap-1.5"
                        title={`Delete ${c.coordinatorName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>DELETE</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {coordinators.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-white/40 font-mono">
                      No coordinators found in roster.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Delete Coordinator Confirmation Dialog */}
          {coordinatorToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
              <div className="relative w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white font-['Space_Grotesk']">
                      Delete Coordinator
                    </h4>
                    <p className="text-xs text-white/60 mt-0.5">
                      Are you sure you want to delete this coordinator?
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-white/40">Name:</span>
                    <span className="text-white font-semibold">{coordinatorToDelete.coordinatorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Email:</span>
                    <span className="text-white/80">{coordinatorToDelete.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Event:</span>
                    <span className="text-[#F27D26] font-semibold">{coordinatorToDelete.assignedEvent}</span>
                  </div>
                </div>

                <p className="text-[11px] text-white/40 font-mono leading-relaxed">
                  This action will delete the coordinator record from the Coordinator Database Google Sheet and permanently revoke login access.
                </p>

                {deleteErrorMessage && (
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-mono flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{deleteErrorMessage}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={deletingCoord}
                    onClick={() => {
                      setCoordinatorToDelete(null);
                      setDeleteErrorMessage(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-mono text-white/60 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    id="btn-confirm-delete-coordinator"
                    disabled={deletingCoord}
                    onClick={handleConfirmDeleteCoordinator}
                    className="px-5 py-2 rounded-xl font-mono text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    {deletingCoord ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>CONFIRM DELETE</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBVIEW 5: SCAN AUDIT LOGS */}
      {/* ============================================================ */}
      {activeTab === 'scan_logs' && (
        <div className="rounded-2xl bg-[#0A0A0A] border border-white/10 p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Complete Scan Audit Trail
              </h3>
              <p className="text-xs text-white/40 font-mono">
                Every scan event (Success, Already Marked, Not Registered, Invalid QR) is logged.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-white/40 font-mono uppercase text-[10px] border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Unique ID</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Coordinator</th>
                  <th className="py-3 px-4">Result</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {scanLogs.map((log, i) => (
                  <tr key={i} className="hover:bg-white/[0.03]">
                    <td className="py-3 px-4 text-white/40 text-[11px]">{log.timestamp}</td>
                    <td className="py-3 px-4 font-bold text-[#F27D26]">{log.uniqueId}</td>
                    <td className="py-3 px-4 text-white/80">{log.scannedEvent}</td>
                    <td className="py-3 px-4 text-white/50">{log.coordinatorName}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          log.result === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : log.result === 'ALREADY_MARKED'
                            ? 'bg-[#FCD34D]/10 text-[#FCD34D] border border-[#FCD34D]/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {log.result}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white/40 text-[11px] truncate max-w-[240px]" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))}
                {scanLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-white/40 font-mono">
                      No scan logs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBVIEW 6: QR RESET LOGS */}
      {/* ============================================================ */}
      {activeTab === 'reset_logs' && (
        <div className="rounded-2xl bg-[#0A0A0A] border border-white/10 p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                QR Reset Audit Logs
              </h3>
              <p className="text-xs text-white/40 font-mono">
                Permanent records of all administrative resets with assigned reasons.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-white/40 font-mono uppercase text-[10px] border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Unique ID</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Admin Name</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Previous Status</th>
                  <th className="py-3 px-4">New Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {resetLogs.map((rl, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.03]">
                    <td className="py-3 px-4 text-white/40 text-[11px]">{rl.timestamp}</td>
                    <td className="py-3 px-4 font-bold text-[#F27D26]">{rl.uniqueId}</td>
                    <td className="py-3 px-4 text-white">{rl.event}</td>
                    <td className="py-3 px-4 text-white/80 font-semibold">{rl.adminName}</td>
                    <td className="py-3 px-4 text-white/50 font-sans">{rl.reason}</td>
                    <td className="py-3 px-4 text-white/40">{rl.previousStatus}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/20">
                        {rl.newStatus}
                      </span>
                    </td>
                  </tr>
                ))}
                {resetLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-white/40 font-mono">
                      No reset operations recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Event Modal */}
      <EventManagementModal
        isOpen={!!selectedEvent}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onEventUpdated={loadAllData}
      />

      {/* Reset Attendance Modal */}
      <ResetAttendanceModal
        isOpen={isResetModalOpen}
        adminName={adminName}
        initialUniqueId={resetInitialId}
        initialEvent={resetInitialEvent}
        onClose={() => setIsResetModalOpen(false)}
        onResetSuccess={loadAllData}
      />
    </div>
  );
};
