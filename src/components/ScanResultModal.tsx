import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  School,
  BookOpen,
  Users,
  Award,
  CalendarCheck,
  Camera,
  X,
  Sparkles,
} from 'lucide-react';
import { ScanResponse } from '../types';

interface ScanResultModalProps {
  isOpen: boolean;
  result: ScanResponse | null;
  onClose: () => void;
  onScanNext: () => void;
}

export const ScanResultModal: React.FC<ScanResultModalProps> = ({
  isOpen,
  result,
  onClose,
  onScanNext,
}) => {
  useEffect(() => {
    if (isOpen && result && result.result === 'SUCCESS') {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#fbbf24', '#f97316', '#ef4444', '#10b981'],
        });
      } catch {
        // Confetti optional
      }
    }
  }, [isOpen, result]);

  if (!isOpen || !result) return null;

  const {
    result: resultCode,
    participant,
    scannedEvent,
    coordinatorName,
    previousScan,
    allEventsCompleted,
    attendedEvents = [],
  } = result;

  const isSuccess = resultCode === 'SUCCESS';
  const isAlreadyMarked = resultCode === 'ALREADY_MARKED';
  const isNotRegistered = resultCode === 'NOT_REGISTERED';
  const isInvalid = resultCode === 'INVALID_QR' || resultCode === 'ERROR';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Status Accent Line */}
        <div
          className={`h-1 w-full ${
            isSuccess
              ? 'bg-emerald-500'
              : isAlreadyMarked
              ? 'bg-[#FCD34D]'
              : isNotRegistered
              ? 'bg-red-500'
              : 'bg-white/20'
          }`}
        />

        {/* Header Status Card */}
        <div className="p-6 border-b border-white/10 bg-[#0A0A0A]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {isSuccess && (
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
              )}
              {isAlreadyMarked && (
                <div className="w-12 h-12 rounded-2xl bg-[#FCD34D]/10 border border-[#FCD34D]/20 flex items-center justify-center text-[#FCD34D]">
                  <AlertTriangle className="w-7 h-7" />
                </div>
              )}
              {isNotRegistered && (
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <XCircle className="w-7 h-7" />
                </div>
              )}
              {isInvalid && (
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                  <XCircle className="w-7 h-7" />
                </div>
              )}

              <div>
                <h3
                  className={`text-xl font-black tracking-tight font-['Space_Grotesk'] uppercase ${
                    isSuccess
                      ? 'text-emerald-400'
                      : isAlreadyMarked
                      ? 'text-[#FCD34D]'
                      : isNotRegistered
                      ? 'text-red-400'
                      : 'text-white'
                  }`}
                >
                  {isSuccess && '✓ ATTENDANCE MARKED'}
                  {isAlreadyMarked && '⚠ ALREADY MARKED'}
                  {isNotRegistered && 'NOT REGISTERED FOR THIS EVENT'}
                  {isInvalid && 'INVALID SCAN'}
                </h3>
                <p className="text-xs text-white/40 font-mono mt-0.5">
                  Event: <span className="text-white font-semibold">{scannedEvent}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ALL REGISTERED EVENTS COMPLETED BANNER */}
          {allEventsCompleted && (
            <div className="mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#FCD34D] shrink-0" />
              <div>
                <div className="text-xs font-bold text-emerald-400 tracking-wide font-mono uppercase">
                  ALL REGISTERED EVENTS COMPLETED
                </div>
                <div className="text-[11px] text-white/70 mt-0.5">
                  The QR code has successfully completed attendance for all enrolled symposium events!
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Body Details */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Section 1: Event & Coordinator Audit Strip */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 font-mono text-xs">
            <div>
              <span className="text-[10px] uppercase text-white/40 block">Current Event</span>
              <span className="text-[#F27D26] font-semibold">{scannedEvent}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-white/40 block">Coordinator</span>
              <span className="text-white">{coordinatorName}</span>
            </div>
          </div>

          {/* Section 2: Previous Scan Details (For ALREADY MARKED) */}
          {isAlreadyMarked && previousScan && (
            <div className="p-3.5 rounded-2xl bg-[#FCD34D]/10 border border-[#FCD34D]/20 text-xs text-[#FCD34D] space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-[#FCD34D]">
                <Clock className="w-3.5 h-3.5" />
                <span>Previously Recorded Record</span>
              </div>
              <p className="text-[11px] text-white/70">
                Previously Scanned By:{' '}
                <span className="font-semibold text-white">{previousScan.coordinatorName}</span>
              </p>
              <p className="text-[11px] text-white/70">
                Time: <span className="font-mono text-white">{previousScan.scanTime}</span>
              </p>
              <p className="text-[10px] font-mono text-[#FCD34D]/80 pt-1">
                Notice: No duplicate attendance row recorded in database.
              </p>
            </div>
          )}

          {/* Section 3: Registered Events Comparison (For NOT REGISTERED) */}
          {isNotRegistered && participant && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-2.5">
              <div className="text-xs font-semibold text-red-300">
                Participant Registered Events:
              </div>
              <div className="space-y-1 text-xs">
                {participant.registeredEvents?.map((ev, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-emerald-400 font-mono">
                    <span>✓</span>
                    <span>{ev}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-red-500/20">
                <div className="text-xs font-semibold text-white/70">Current Coordinator Event:</div>
                <div className="flex items-center gap-2 text-red-400 font-mono mt-1 text-xs font-bold">
                  <span>✗</span>
                  <span>{scannedEvent}</span>
                </div>
              </div>

              <p className="text-[10px] text-red-300/80 font-mono pt-1">
                Notice: Attendance was NOT marked. Direct participant to their registered event venue.
              </p>
            </div>
          )}

          {/* Section 4: Full Participant Details Card */}
          {participant ? (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#F27D26]" />
                  <span className="text-sm font-bold text-white">{participant.name}</span>
                </div>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/20">
                  {participant.unique_id || participant.uniqueId}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-white/40 uppercase block font-mono">
                    Registration No
                  </span>
                  <span className="text-white font-mono">
                    {participant.registrationNo || participant.universityRegistrationNumber || 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-white/40 uppercase block font-mono">
                    College / Institution
                  </span>
                  <span
                    className="text-white truncate block"
                    title={`${participant.college || participant.collegeName || ''} ${participant.collegeLocation || ''}`}
                  >
                    {participant.college || participant.collegeName || 'N/A'}
                    {participant.collegeLocation ? ` (${participant.collegeLocation})` : ''}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-white/40 uppercase block font-mono">
                    Department & Degree
                  </span>
                  <span className="text-white">
                    {participant.degree ? `${participant.degree} ` : ''}
                    {participant.department || 'N/A'}
                    {participant.year ? ` • Year ${participant.year}` : ''}
                  </span>
                </div>

                {participant.fieldOfStudy && (
                  <div>
                    <span className="text-[10px] text-white/40 uppercase block font-mono">
                      Field of Study
                    </span>
                    <span className="text-white truncate block">
                      {participant.fieldOfStudy}
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-[10px] text-white/40 uppercase block font-mono">
                    Contact Details
                  </span>
                  <span className="text-white font-mono text-[11px] block">
                    {participant.mobile || participant.mobileNumber || participant.email || 'N/A'}
                  </span>
                  {participant.email && (participant.mobile || participant.mobileNumber) && (
                    <span className="text-white/60 font-mono text-[10px] block truncate">
                      {participant.email}
                    </span>
                  )}
                </div>

                {(participant.teamName || participant.leaderName || participant.members || participant.membersName) && (
                  <div className="sm:col-span-2 pt-1 border-t border-white/5 space-y-1">
                    <span className="text-[10px] text-white/40 uppercase block font-mono">
                      Team Information
                    </span>
                    <div className="text-white space-y-0.5">
                      {participant.teamName && (
                        <div>
                          <span className="text-white/50">Team: </span>
                          <span className="font-semibold text-[#F27D26]">{participant.teamName}</span>
                        </div>
                      )}
                      {participant.leaderName && (
                        <div>
                          <span className="text-white/50">Leader: </span>
                          <span>{participant.leaderName}</span>
                          {participant.teamLeaderEmail && (
                            <span className="text-white/40 text-[11px]"> ({participant.teamLeaderEmail})</span>
                          )}
                        </div>
                      )}
                      {(participant.members || participant.membersName) && (
                        <div>
                          <span className="text-white/50">Members: </span>
                          <span className="text-white/80">{participant.members || participant.membersName}</span>
                        </div>
                      )}
                      {(participant.member1Mobile || participant.member2Mobile) && (
                        <div className="text-white/50 text-[11px] font-mono">
                          Mobiles: {[participant.member1Mobile, participant.member2Mobile].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Registered Events Status Chips */}
              <div className="pt-2 border-t border-white/10">
                <span className="text-[10px] text-white/40 uppercase block font-mono mb-1.5">
                  Registered Events ({participant.registeredEvents?.length || 0}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {participant.registeredEvents?.map((ev, i) => {
                    const isAttended = attendedEvents.some(
                      (ae) => ae.toLowerCase() === ev.toLowerCase()
                    );
                    const isCurrent = ev.toLowerCase() === scannedEvent.toLowerCase();
                    return (
                      <span
                        key={i}
                        className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                          isAttended
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : isCurrent
                            ? 'bg-[#F27D26]/10 text-[#F27D26] border-[#F27D26]/20 font-bold'
                            : 'bg-white/5 text-white/40 border-white/10'
                        }`}
                      >
                        <span>{isAttended ? '✓' : isCurrent ? '▶' : '○'}</span>
                        <span>{ev}</span>
                        <span className="text-[9px] opacity-80">
                          {isAttended ? '(ATTENDED)' : isCurrent ? '(CURRENT)' : '(PENDING)'}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-white/40 font-mono text-center">
              No participant details decoded.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-[#070707] border-t border-white/10 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl text-xs font-mono text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            Close
          </button>

          <button
            id="btn-scan-next-participant"
            onClick={onScanNext}
            className="flex-1 py-3 px-5 rounded-xl font-bold text-xs uppercase tracking-widest text-[#070707] bg-[#F27D26] hover:opacity-90 shadow-lg shadow-[#F27D26]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4 text-[#070707]" />
            <span>SCAN NEXT PARTICIPANT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
