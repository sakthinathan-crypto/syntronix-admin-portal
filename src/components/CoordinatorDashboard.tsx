import React, { useState, useEffect } from 'react';
import {
  QrCode,
  CalendarCheck,
  Clock,
  AlertTriangle,
  Users,
  Search,
  RefreshCw,
  Download,
  CheckCircle2,
  ListFilter,
  Camera,
  Trash2,
  RotateCcw,
  X,
} from 'lucide-react';
import { CoordinatorStats, AttendanceRecord, AuthSession } from '../types';
import { getCoordinatorStats, getAttendance, deleteAttendanceRecord } from '../services/api';

interface CoordinatorDashboardProps {
  session: AuthSession;
  onOpenScanner: () => void;
  refreshTrigger?: number;
}

export const CoordinatorDashboard: React.FC<CoordinatorDashboardProps> = ({
  session,
  onOpenScanner,
  refreshTrigger,
}) => {
  const coordinatorName = session.user.name;
  const assignedEvent = session.user.assignedEvent || 'Assigned Event';

  const [stats, setStats] = useState<CoordinatorStats>({
    todayAttendance: 0,
    totalScans: 0,
    alreadyMarkedAttempts: 0,
    recentScans: [],
  });
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'scan_overview' | 'attendance_list'>('scan_overview');

  // Testing mode removal state
  const [recordToDelete, setRecordToDelete] = useState<AttendanceRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, attData] = await Promise.all([
        getCoordinatorStats(assignedEvent),
        getAttendance(assignedEvent),
      ]);
      setStats(statsData);
      setAttendanceList(attData);
    } catch (err) {
      console.error('Failed to load coordinator data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [assignedEvent, refreshTrigger]);

  const handleConfirmRemove = async () => {
    if (!recordToDelete) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deleteAttendanceRecord(recordToDelete.uniqueId, assignedEvent);

      // Optimistically update lists and stats
      setAttendanceList((prev) =>
        prev.filter((a) => a.uniqueId.toLowerCase() !== recordToDelete.uniqueId.toLowerCase())
      );
      setStats((prev) => ({
        ...prev,
        todayAttendance: Math.max(0, prev.todayAttendance - 1),
        totalScans: Math.max(0, prev.totalScans - 1),
        recentScans: prev.recentScans.filter(
          (s) => s.uniqueId.toLowerCase() !== recordToDelete.uniqueId.toLowerCase()
        ),
      }));

      setDeleteMessage(
        `Participant "${recordToDelete.participantName}" (${recordToDelete.uniqueId}) was removed from attendance. Scanned count reduced! QR code can now be scanned again.`
      );
      setRecordToDelete(null);

      // Fetch fresh data from backend
      await fetchDashboardData();

      setTimeout(() => {
        setDeleteMessage(null);
      }, 7000);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to remove attendance record.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemoveFromRecent = (uniqueId: string) => {
    const matched = attendanceList.find(
      (a) => a.uniqueId.toLowerCase() === uniqueId.toLowerCase()
    ) || {
      uniqueId,
      participantName: uniqueId,
      universityRegNumber: '',
      email: '',
      mobileNumber: '',
      collegeName: '',
      scannedEvent: assignedEvent,
      coordinatorName,
      attendanceTime: '',
      attendanceStatus: 'PRESENT' as const,
      timestamp: new Date().toISOString(),
    };
    setRecordToDelete(matched);
  };

  // Filter attendance records
  const filteredRecords = attendanceList.filter((rec) => {
    const q = searchQuery.toLowerCase();
    return (
      rec.uniqueId.toLowerCase().includes(q) ||
      rec.participantName.toLowerCase().includes(q) ||
      rec.universityRegNumber.toLowerCase().includes(q) ||
      rec.collegeName.toLowerCase().includes(q)
    );
  });

  const exportCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = [
      'Timestamp',
      'Unique ID',
      'Participant Name',
      'Reg Number',
      'College',
      'Event',
      'Coordinator',
      'Time',
      'Status',
    ];
    const rows = filteredRecords.map((r) => [
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
    link.setAttribute('download', `${assignedEvent.replace(/\s+/g, '_')}_Attendance.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Success Notification */}
      {deleteMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{deleteMessage}</span>
          </div>
          <button
            onClick={() => setDeleteMessage(null)}
            className="text-emerald-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {deleteError && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 font-mono text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{deleteError}</span>
          </div>
          <button
            onClick={() => setDeleteError(null)}
            className="text-red-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0A0A0A] border border-white/10 shadow-2xl relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#F27D26] blur-[100px] opacity-15 pointer-events-none rounded-full" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs font-mono mb-3">
              <Users className="w-3.5 h-3.5 text-[#F27D26]" />
              <span className="uppercase tracking-wider text-[11px]">Event Coordinator Station</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight">
              Welcome, <span className="text-[#F27D26]">{coordinatorName}</span>
            </h1>
            <p className="text-sm text-white/40 font-mono mt-1">
              Assigned Event:{' '}
              <span className="text-white font-bold tracking-wide uppercase px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-xs">
                {assignedEvent}
              </span>
            </p>
          </div>

          {/* Primary Action Button: SCAN PARTICIPANT QR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              id="btn-scan-participant-qr"
              onClick={onOpenScanner}
              className="py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-widest text-[#070707] bg-[#F27D26] hover:opacity-90 shadow-lg shadow-[#F27D26]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4 text-[#070707]" />
              <span>SCAN PARTICIPANT QR</span>
            </button>

            <button
              onClick={fetchDashboardData}
              disabled={loading}
              title="Refresh Live Data"
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors flex items-center justify-center"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#F27D26]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/5 mb-6">
        <button
          onClick={() => setActiveTab('scan_overview')}
          className={`pb-3 px-4 text-xs font-mono font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'scan_overview'
              ? 'border-[#F27D26] text-[#F27D26]'
              : 'border-transparent text-white/40 hover:text-white/80'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Scanner & Statistics</span>
        </button>
        <button
          onClick={() => setActiveTab('attendance_list')}
          className={`pb-3 px-4 text-xs font-mono font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'attendance_list'
              ? 'border-[#F27D26] text-[#F27D26]'
              : 'border-transparent text-white/40 hover:text-white/80'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Event Attendance ({attendanceList.length})</span>
        </button>
      </div>

      {activeTab === 'scan_overview' ? (
        <div className="space-y-8">
          {/* Dashboard Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Card 1: Today's Attendance */}
            <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-white/40 tracking-wider">
                  Today&apos;s Attendance
                </span>
                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70">
                  <CalendarCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-4xl font-black text-white font-['Space_Grotesk'] mt-4">
                {stats.todayAttendance}
              </div>
              <p className="text-[11px] text-white/40 font-mono mt-1">
                Verified entries for {assignedEvent}
              </p>
            </div>

            {/* Card 2: Total Successful Scans */}
            <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-white/40 tracking-wider">
                  Total Successful Scans
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-4xl font-black text-emerald-400 font-['Space_Grotesk'] mt-4">
                {stats.totalScans}
              </div>
              <p className="text-[11px] text-white/40 font-mono mt-1">
                Synced with Google Sheets
              </p>
            </div>

            {/* Card 3: Already Marked Attempts */}
            <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-white/40 tracking-wider">
                  Already Marked Attempts
                </span>
                <div className="w-9 h-9 rounded-xl bg-[#FCD34D]/10 border border-[#FCD34D]/20 flex items-center justify-center text-[#FCD34D]">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-4xl font-black text-[#FCD34D] font-['Space_Grotesk'] mt-4">
                {stats.alreadyMarkedAttempts}
              </div>
              <p className="text-[11px] text-white/40 font-mono mt-1">
                Duplicate scans blocked
              </p>
            </div>
          </div>

          {/* Recent Scans Section */}
          <div className="rounded-2xl bg-[#0A0A0A] border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#F27D26]" />
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Recent Scans ({assignedEvent})
                </h3>
              </div>
              <span className="text-xs font-mono text-white/40">
                Last {stats.recentScans.length} activities
              </span>
            </div>

            {stats.recentScans.length > 0 ? (
              <div className="divide-y divide-white/5">
                {stats.recentScans.map((scan, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="font-mono text-sm font-semibold text-white">
                        {scan.uniqueId}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-white/40">{scan.time}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromRecent(scan.uniqueId)}
                        title="Remove from attendance (Testing)"
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[11px] font-mono transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="text-[10px] hidden sm:inline">Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs font-mono text-white/40">
                No recent scans recorded yet. Click &quot;SCAN PARTICIPANT QR&quot; to begin.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Event Attendance Registry (Restricted to assigned event only) */
        <div className="rounded-2xl bg-[#0A0A0A] border border-white/10 p-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Unique ID, name, college, reg no..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#F27D26] font-mono"
              />
            </div>

            <button
              onClick={exportCSV}
              disabled={filteredRecords.length === 0}
              className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white hover:text-[#F27D26] flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-white/5 text-white/40 font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Unique ID</th>
                  <th className="py-3 px-4">Participant Name</th>
                  <th className="py-3 px-4">Reg No</th>
                  <th className="py-3 px-4">College</th>
                  <th className="py-3 px-4">Scanned Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Testing Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {filteredRecords.map((rec, i) => (
                  <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#F27D26]">{rec.uniqueId}</td>
                    <td className="py-3 px-4 text-white font-sans font-medium">
                      {rec.participantName}
                    </td>
                    <td className="py-3 px-4 text-white/50">{rec.universityRegNumber || '—'}</td>
                    <td className="py-3 px-4 text-white/50 truncate max-w-[200px]" title={rec.collegeName}>
                      {rec.collegeName || '—'}
                    </td>
                    <td className="py-3 px-4 text-white/40">{rec.attendanceTime}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {rec.attendanceStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setRecordToDelete(rec)}
                        title="Remove from attendance (Testing)"
                        className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[11px] font-mono inline-flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-white/40 font-mono">
                      No attendance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Remove Attendance Confirmation Modal (Testing) */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-[#0D0D0D] border border-red-500/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                    Remove From Attendance?
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-red-500/20 text-red-300 font-bold uppercase">
                    Testing Mode
                  </span>
                </div>
                <p className="text-xs text-white/60 mt-1">
                  Remove participant <strong className="text-white">{recordToDelete.participantName}</strong> ({recordToDelete.uniqueId}) from {assignedEvent} attendance?
                </p>
                <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/50 font-mono space-y-1">
                  <div>• Scanned QR count will decrease by 1</div>
                  <div>• Record deleted from Google Sheet and system registry</div>
                  <div>• QR code will become eligible for immediate re-scanning</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-mono text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmRemove}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-white bg-red-600 hover:bg-red-500 active:scale-95 shadow-lg shadow-red-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Confirm Remove & Reset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
