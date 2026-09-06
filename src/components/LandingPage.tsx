import React from 'react';
import {
  Shield,
  KeyRound,
  QrCode,
  Lock,
  Database,
  Users,
  CheckCircle2,
  CalendarCheck,
  Terminal,
  ExternalLink,
  Cpu,
} from 'lucide-react';

interface LandingPageProps {
  onOpenAdminLogin: () => void;
  onOpenCoordinatorLogin: () => void;
  onOpenSettings: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenAdminLogin,
  onOpenCoordinatorLogin,
  onOpenSettings,
}) => {
  return (
    <div className="relative min-h-[calc(100vh-100px)] flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#070707] via-[#0A0A0A] to-[#0F0D0B]">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[300px] bg-[#F27D26] blur-[100px] opacity-15 pointer-events-none rounded-full" />
      <div className="absolute -bottom-10 right-10 w-[350px] h-[250px] bg-[#FCD34D] blur-[90px] opacity-10 pointer-events-none rounded-full" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-16 w-full relative z-10">
        {/* Notice badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs font-mono tracking-wider uppercase backdrop-blur-sm">
            <Lock className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>Authorized Personnel Only • Internal Admin Portal</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-xs sm:text-sm font-mono tracking-widest text-white/40 uppercase mb-3">
            EGS Pillay Engineering College • Department of CSE
          </h2>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white font-['Space_Grotesk'] leading-tight">
            SYNTRONIX <span className="text-[#F27D26]">&apos;26</span>
          </h1>
          <p className="text-lg sm:text-xl font-medium text-[#FCD34D] mt-2 font-mono">
            International Technical Symposium Administration Portal
          </p>
          <p className="text-white/60 text-sm sm:text-base mt-4 max-w-2xl mx-auto leading-relaxed">
            Centralized control center for real-time QR attendance verification, multi-event coordination, jury assignment, and Google Sheets database synchronization.
          </p>
        </div>

        {/* PRIMARY ACCESS ENTRY POINTS */}
        <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {/* Card 1: DEDICATED ADMIN LOGIN (Highest priority as instructed) */}
          <div className="group relative rounded-2xl p-6 bg-[#0A0A0A] border border-white/10 hover:border-[#F27D26]/40 shadow-2xl shadow-black/80 transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-28 h-28 bg-[#F27D26] blur-[60px] opacity-20 pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#F27D26]">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/30">
                  MASTER ACCESS
                </span>
              </div>

              <h3 className="text-xl font-bold text-white mb-2 font-['Space_Grotesk']">
                Overall Administration
              </h3>
              <p className="text-xs text-white/50 leading-relaxed mb-6">
                Complete symposium governance. Manage events, register coordinators, assign jury members, view all attendance, audit scan logs, and reset QR states.
              </p>
            </div>

            <div>
              {/* Dedicated ADMIN LOGIN button */}
              <button
                id="btn-admin-login"
                onClick={onOpenAdminLogin}
                className="w-full py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-widest text-[#070707] bg-[#F27D26] hover:opacity-90 shadow-lg shadow-[#F27D26]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4 text-[#070707]" />
                <span>ADMIN LOGIN</span>
              </button>
              <p className="text-[10px] text-white/30 font-mono text-center mt-2.5">
                Requires Admin Access Key + Credentials
              </p>
            </div>
          </div>

          {/* Card 2: COORDINATOR LOGIN */}
          <div className="group relative rounded-2xl p-6 bg-[#0A0A0A] border border-white/10 hover:border-white/20 shadow-2xl shadow-black/80 transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70">
                  <QrCode className="w-5 h-5 text-[#FCD34D]" />
                </div>
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-white/5 text-white/60 border border-white/10">
                  EVENT STAFF
                </span>
              </div>

              <h3 className="text-xl font-bold text-white mb-2 font-['Space_Grotesk']">
                Coordinator Portal
              </h3>
              <p className="text-xs text-white/50 leading-relaxed mb-6">
                Fast camera-based QR scanner for assigned technical and non-technical events. Automatically verifies registration and marks attendance in real-time.
              </p>
            </div>

            <div>
              <button
                id="btn-coordinator-login"
                onClick={onOpenCoordinatorLogin}
                className="w-full py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-widest text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4 text-[#F27D26]" />
                <span>COORDINATOR LOGIN</span>
              </button>
              <p className="text-[10px] text-white/30 font-mono text-center mt-2.5">
                Login with assigned email and coordinator password
              </p>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-2.5 text-[#F27D26] font-mono text-xs font-semibold mb-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Multi-Event Validity</span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">
              Participant QR codes are validated once per registered event. The composite key <span className="text-white font-mono">UNIQUE ID + EVENT</span> strictly prevents duplicates.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-2.5 text-[#F27D26] font-mono text-xs font-semibold mb-1.5">
              <Database className="w-4 h-4" />
              <span>Google Sheets Database</span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">
              Decoupled Google Apps Script Web App syncs with separate sheets: ADMINS, COORDINATORS, EVENTS, JURY, ATTENDANCE, and SCAN LOGS.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-2.5 text-[#F27D26] font-mono text-xs font-semibold mb-1.5">
              <Lock className="w-4 h-4" />
              <span>Concurrency Protection</span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">
              Apps Script LockService and server mutex prevent race conditions when multiple coordinators scan simultaneously at busy venues.
            </p>
          </div>
        </div>

        {/* Quick System Config link for project owners */}
        <div className="mt-12 text-center">
          <button
            onClick={onOpenSettings}
            className="inline-flex items-center gap-2 text-xs font-mono text-white/40 hover:text-[#F27D26] transition-colors underline-offset-4 hover:underline"
          >
            <Database className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>Configure Backend Google Apps Script Web App URL</span>
          </button>
        </div>
      </div>

      {/* Footer credits */}
      <footer className="border-t border-white/5 py-6 bg-[#070707] relative z-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40 font-mono">
          <div>
            <span className="text-white/40">SYNTRONIX &apos;26 • EGS Pillay Engineering College, Nagapattinam</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/40">
            <span>Designed & Developed by</span>
            <span className="text-[#F27D26] font-semibold tracking-wide">Aegis Academy</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
