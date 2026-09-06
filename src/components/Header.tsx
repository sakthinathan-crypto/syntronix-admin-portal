import React from 'react';
import { Shield, Sparkles, LogOut, CheckCircle2, AlertTriangle, Database, Cpu, User } from 'lucide-react';
import { AuthSession, BackendConfig } from '../types';

interface HeaderProps {
  session: AuthSession | null;
  config: BackendConfig | null;
  onLogout: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  config,
  onLogout,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#0A0A0A] border-b border-white/5 shadow-2xl shadow-black/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Left: Branding & Symposium Identity */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 shadow-inner">
            <Cpu className="w-5 h-5 text-[#F27D26]" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#F27D26] animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-white/5 text-[#F27D26] border border-white/10">
                EGS Pillay Engg College
              </span>
              <span className="text-[11px] text-white/40 hidden md:inline font-mono">
                Dept. of Computer Science & Engineering
              </span>
            </div>
            <div className="flex items-center gap-2.5 mt-0.5">
              <h1 className="text-xl font-bold tracking-tighter text-[#F27D26] font-['Space_Grotesk']">
                SYNTRONIX &apos;26
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/60 border border-white/10 uppercase tracking-[0.2em] font-medium font-mono">
                Admin Portal v1.0
              </span>
            </div>
          </div>
        </div>

        {/* Right: Credits, Status & Session Info */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Backend Status indicator */}
          <button
            onClick={onOpenSettings}
            title={config?.googleAppsScriptUrl ? "Connected to Google Apps Script Web App" : "Running on Google Sheets Emulation Engine"}
            className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/15"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
            <span>
              {config?.googleAppsScriptUrl ? 'Database Online (Live)' : 'Database Online'}
            </span>
          </button>

          {/* Session Profile */}
          {session ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                <div className="w-8 h-8 rounded-full bg-[#F27D26]/20 border border-[#F27D26]/40 flex items-center justify-center text-[#F27D26] font-bold text-xs">
                  {session.user.name.charAt(0)}
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <div className="text-xs font-semibold text-white">
                    {session.user.name}
                  </div>
                  <div className="text-[10px] text-[#F27D26] uppercase font-bold tracking-wider font-mono">
                    {session.user.role === 'OVERALL_ADMIN'
                      ? 'Overall Admin'
                      : `Coord: ${session.user.assignedEvent || 'Assigned'}`}
                  </div>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="p-2 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/40 font-mono">
              <Shield className="w-3.5 h-3.5 text-[#F27D26]" />
              <span className="uppercase tracking-wider text-[11px]">Internal Admin Portal</span>
            </div>
          )}
        </div>
      </div>

      {/* Aegis Academy Developer Credit Sub-strip */}
      <div className="bg-[#070707] border-t border-white/5 py-1.5 px-4 text-center">
        <p className="text-[10px] font-mono tracking-widest text-white/30 uppercase">
          EGS Pillay Engineering College — CSE • Designed & Developed by <span className="text-[#F27D26] font-semibold">Aegis Academy</span>
        </p>
      </div>
    </header>
  );
};
