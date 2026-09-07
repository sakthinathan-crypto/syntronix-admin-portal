import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { AdminLoginModal } from './components/AdminLoginModal';
import { CoordinatorLoginModal } from './components/CoordinatorLoginModal';
import { CoordinatorDashboard } from './components/CoordinatorDashboard';
import { OverallAdminDashboard } from './components/OverallAdminDashboard';
import { QRScannerModal } from './components/QRScannerModal';
import { ScanResultModal } from './components/ScanResultModal';
import { SystemSettingsModal } from './components/SystemSettingsModal';
import {
  AuthSession,
  BackendConfig,
  ParticipantQRData,
  ScanResponse,
} from './types';
import {
  getStoredSession,
  clearStoredSession,
  getSystemConfig,
  scanParticipantQR,
} from './services/api';

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [config, setConfig] = useState<BackendConfig | null>(null);

  // Modal visibility states
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isCoordinatorLoginOpen, setIsCoordinatorLoginOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Scanner & Result states
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);

  // Initialize session and backend config on load
  useEffect(() => {
    const activeSession = getStoredSession();
    if (activeSession) {
      setSession(activeSession);
    }
    getSystemConfig()
      .then(setConfig)
      .catch((err) => console.warn('Failed to load system config:', err));
  }, []);

  const handleLogout = () => {
    clearStoredSession();
    setSession(null);
    setIsScannerOpen(false);
    setIsResultOpen(false);
  };

  const handleLoginSuccess = (newSession: AuthSession) => {
    setSession(newSession);
    setIsAdminLoginOpen(false);
    setIsCoordinatorLoginOpen(false);
  };

  // Process decoded participant QR data
  const handleScanDecoded = async (participant: ParticipantQRData) => {
    if (!session || session.user.role !== 'EVENT_COORDINATOR') {
      alert('Only event coordinators can submit attendance scans.');
      return;
    }

    const assignedEvent = session.user.assignedEvent || '';
    const coordinatorName = session.user.name;

    try {
      setIsProcessingScan(true);
      setIsScannerOpen(false);
      const res = await scanParticipantQR(participant, assignedEvent, coordinatorName);
      setScanResult(res);
      setIsResultOpen(true);
    } catch (err: any) {
      setScanResult({
        result: 'ERROR',
        message: err.message || 'An unexpected error occurred while scanning.',
        participant,
        scannedEvent: assignedEvent,
        coordinatorName,
      });
      setIsScannerOpen(false);
      setIsResultOpen(true);
    } finally {
      setIsProcessingScan(false);
    }
  };

  // Re-open scanner for rapid scanning
  const handleScanNext = () => {
    setIsResultOpen(false);
    setScanResult(null);
    setIsScannerOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#070707] text-[#E0E0E0] flex flex-col selection:bg-[#F27D26]/30 selection:text-[#FCD34D]">
      {/* Universal Header */}
      <Header
        session={session}
        config={config}
        onLogout={handleLogout}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main View Switching based on Authentication Role */}
      <main className="flex-1">
        {!session && (
          <LandingPage
            onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
            onOpenCoordinatorLogin={() => setIsCoordinatorLoginOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}

        {session && session.user.role === 'OVERALL_ADMIN' && (
          <OverallAdminDashboard
            session={session}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}

        {session && session.user.role === 'EVENT_COORDINATOR' && (
          <CoordinatorDashboard
            session={session}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        )}
      </main>

      {/* Modals & Dialogs */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <CoordinatorLoginModal
        isOpen={isCoordinatorLoginOpen}
        onClose={() => setIsCoordinatorLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <SystemSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigSaved={(updated) => setConfig(updated)}
      />

      {/* QR Scanner Modal (Coordinators only) */}
      {session && session.user.role === 'EVENT_COORDINATOR' && (
        <QRScannerModal
          isOpen={isScannerOpen}
          assignedEvent={session.user.assignedEvent || 'Assigned Event'}
          coordinatorName={session.user.name}
          onClose={() => setIsScannerOpen(false)}
          onScanComplete={handleScanDecoded}
        />
      )}

      {/* QR Scan Result Modal */}
      <ScanResultModal
        isOpen={isResultOpen}
        result={scanResult}
        onClose={() => setIsResultOpen(false)}
        onScanNext={handleScanNext}
      />
    </div>
  );
}
