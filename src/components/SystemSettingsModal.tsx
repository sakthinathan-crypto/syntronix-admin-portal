import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Save,
  Code,
  Sparkles,
} from 'lucide-react';
import { BackendConfig } from '../types';
import { getSystemConfig, updateSystemConfig, testGASConnection } from '../services/api';

interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: (config: BackendConfig) => void;
}

export const SystemSettingsModal: React.FC<SystemSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [gasUrl, setGasUrl] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [activeTab, setActiveTab] = useState<'config' | 'gas_code' | 'instructions'>('config');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const cfg = await getSystemConfig();
      setGasUrl(cfg.googleAppsScriptUrl || '');
      setAccessKey(cfg.adminAccessKey || '');
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await updateSystemConfig({
        googleAppsScriptUrl: gasUrl.trim(),
        adminAccessKey: accessKey.trim(),
      });
      onConfigSaved(updated);
      alert('System configuration updated successfully.');
    } catch (err: any) {
      alert('Failed to save config: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testGASConnection(gasUrl.trim());
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed.',
      });
    } finally {
      setTesting(false);
    }
  };

  const copyGASCode = () => {
    const gasSnippet = `// SYNTRONIX '26 Google Apps Script Backend (Code.gs)
// Please see /gas/Code.gs in the repository for the full production script
// Designed & Developed by Aegis Academy`;
    navigator.clipboard.writeText(gasSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top accent */}
        <div className="h-1 w-full bg-[#F27D26]" />

        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#F27D26]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Backend & Google Sheets Database Configuration
              </h3>
              <p className="text-xs text-white/40 font-mono">
                Decoupled Google Apps Script Web App Endpoint
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

        {/* Tab Strip */}
        <div className="px-6 border-b border-white/10 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-3 px-3 text-xs font-mono font-semibold border-b-2 transition-colors ${
              activeTab === 'config'
                ? 'border-[#F27D26] text-[#F27D26]'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            Endpoints & Keys
          </button>
          <button
            onClick={() => setActiveTab('instructions')}
            className={`py-3 px-3 text-xs font-mono font-semibold border-b-2 transition-colors ${
              activeTab === 'instructions'
                ? 'border-[#F27D26] text-[#F27D26]'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            Setup Guide (7 Sheets)
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'config' && (
            <form onSubmit={handleSave} className="space-y-5">
              {/* GAS URL Field */}
              <div>
                <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">
                  Google Apps Script Web App Endpoint
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={gasUrl}
                    onChange={(e) => setGasUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#F27D26] text-xs font-mono text-white placeholder-white/30 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-white border border-white/10 transition-colors disabled:opacity-50"
                  >
                    {testing ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
                <p className="text-[11px] text-white/40 font-mono mt-1">
                  Leave empty to operate on the high-performance local Google Sheets emulation engine.
                </p>
              </div>

              {testResult && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-[#FCD34D]/10 border border-[#FCD34D]/30 text-[#FCD34D]'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-[#FCD34D] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold block font-mono">
                      {testResult.success ? 'Connection Successful' : 'Notice'}
                    </span>
                    <span className="text-[11px] mt-0.5 block">{testResult.message}</span>
                  </div>
                </div>
              )}

              {/* Admin Access Key */}
              <div>
                <label className="block text-xs font-mono uppercase text-white/60 mb-1.5">
                  Admin Access Key (ADMIN_ACCESS_KEY)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    placeholder="aegis-syntronix-2026-key"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#F27D26] text-xs font-mono text-white focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-white/40 font-mono mt-1">
                  Used to guard the initial Overall Admin authentication endpoint.
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 rounded-xl text-xs font-mono text-white/40 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="py-2.5 px-5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-[#070707] bg-[#F27D26] hover:opacity-90 transition-colors flex items-center gap-1.5 shadow-lg shadow-[#F27D26]/20"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'instructions' && (
            <div className="space-y-4 text-xs leading-relaxed text-white/70">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <h4 className="font-bold text-white font-['Space_Grotesk'] text-sm mb-2">
                  Google Sheets Schema (Auto-Created by Code.gs)
                </h4>
                <p className="text-white/50 mb-3">
                  When deployed, the Google Apps Script creates and initializes these 7 distinct sheets with header columns automatically:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5 font-mono text-[11px] text-[#FCD34D]">
                  <li><strong className="text-white">ADMINS:</strong> Admin ID, Admin Name, Password Hash, Role, Status</li>
                  <li><strong className="text-white">COORDINATORS:</strong> Coordinator ID, Name, Email, Password Hash, Assigned Event, Status</li>
                  <li><strong className="text-white">EVENTS:</strong> Event ID, Event Name, Category, Description, Status</li>
                  <li><strong className="text-white">JURY:</strong> Jury ID, Jury Name, Event, Status, Created At</li>
                  <li><strong className="text-white">ATTENDANCE:</strong> Timestamp, Unique ID, Name, Reg No, College, Event, Coordinator, Time, Status</li>
                  <li><strong className="text-white">SCAN LOGS:</strong> Timestamp, Unique ID, Scanned Event, Coordinator, Result, Details</li>
                  <li><strong className="text-white">QR RESET LOGS:</strong> Timestamp, Unique ID, Event, Admin Name, Reason, Previous Status, New Status</li>
                </ol>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <h4 className="font-bold text-white font-['Space_Grotesk'] text-sm">
                  Deployment Steps in Google Apps Script
                </h4>
                <ol className="list-decimal pl-5 space-y-2 text-white/70">
                  <li>Create a new Google Sheet named <code className="text-[#F27D26]">SYNTRONIX_26_DB</code>.</li>
                  <li>Go to <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Copy all contents from <code className="text-[#F27D26]">/gas/Code.gs</code> and paste them into the script editor.</li>
                  <li>Click <strong>Deploy &gt; New Deployment</strong>. Select <strong>Web App</strong>.</li>
                  <li>Execute as: <strong>Me</strong> | Who has access: <strong>Anyone</strong>.</li>
                  <li>Copy the resulting Web App URL and paste it into the <strong>Endpoints & Keys</strong> tab above!</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
