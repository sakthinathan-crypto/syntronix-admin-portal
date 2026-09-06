import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  X,
  FlipHorizontal,
  Sparkles,
  AlertCircle,
  FileText,
  Upload,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { parseParticipantQR, generateSampleParticipantQR } from '../utils/qrParser';
import { ParticipantQRData } from '../types';

interface QRScannerModalProps {
  isOpen: boolean;
  assignedEvent: string;
  coordinatorName: string;
  onClose: () => void;
  onScanComplete: (participant: ParticipantQRData) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  assignedEvent,
  coordinatorName,
  onClose,
  onScanComplete,
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualPayload, setManualPayload] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'syntronix-qr-reader';

  // Handle scanned text
  const handleDecodedText = (decodedText: string) => {
    try {
      const participant = parseParticipantQR(decodedText);
      if (participant) {
        // Stop scanner immediately
        stopCamera();
        onScanComplete(participant);
      } else {
        setCameraError('Scanned QR does not contain valid participant data.');
      }
    } catch (err: any) {
      setCameraError('Failed to parse QR code: ' + err.message);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // ignore
        }
      }

      const html5QrCode = new Html5Qrcode(readerElementId);
      scannerRef.current = html5QrCode;

      const qrCodeSuccessCallback = (decodedText: string) => {
        handleDecodedText(decodedText);
      };

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: facingMode },
        config,
        qrCodeSuccessCallback,
        () => {
          // scanning frames
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setIsScanning(false);
      setCameraError(
        'Unable to access camera. Please allow camera permissions, or use the quick test presets below.'
      );
      setShowManualInput(true);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn('Error stopping camera:', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (isOpen && !showManualInput) {
      // Small timeout to allow DOM node to render
      const timer = setTimeout(() => {
        startCamera();
      }, 250);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, showManualInput]);

  const handleFlipCamera = async () => {
    await stopCamera();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleClose = async () => {
    await stopCamera();
    onClose();
  };

  // Preset quick testing triggers
  const handleQuickPreset = (preset: 'paper_and_nontech' | 'poster_only' | 'wrong_event' | 'all_events') => {
    const raw = generateSampleParticipantQR(preset);
    handleDecodedText(raw);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPayload.trim()) return;
    handleDecodedText(manualPayload);
  };

  // Image file drop/select
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode(readerElementId);
      const decodedText = await html5QrCode.scanFile(file, true);
      handleDecodedText(decodedText);
    } catch (err: any) {
      setCameraError('No valid QR code found in selected image.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top accent */}
        <div className="h-1 w-full bg-[#F27D26]" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#F27D26]">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Participant QR Scanner
              </h3>
              <p className="text-[11px] text-white/40 font-mono">
                Assigned Event: <span className="text-[#F27D26] font-semibold">{assignedEvent}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col items-center">
          {cameraError && (
            <div className="w-full mb-3 p-3 rounded-xl bg-[#FCD34D]/10 border border-[#FCD34D]/20 flex items-start gap-2.5 text-xs text-[#FCD34D]">
              <AlertCircle className="w-4 h-4 text-[#FCD34D] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Camera Access Notice</p>
                <p className="mt-0.5 text-white/70">{cameraError}</p>
              </div>
            </div>
          )}

          {!showManualInput ? (
            <div className="w-full flex flex-col items-center">
              {/* Camera Target Container */}
              <div className="relative w-full max-w-[340px] aspect-square rounded-2xl overflow-hidden bg-black border-2 border-white/10 shadow-inner flex items-center justify-center">
                <div id={readerElementId} className="w-full h-full object-cover" />

                {/* Laser scan line effect */}
                <div className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-[#F27D26] to-transparent shadow-[0_0_12px_#F27D26] animate-pulse" />

                {/* Target Frame Corners */}
                <div className="pointer-events-none absolute inset-6 border-2 border-dashed border-[#F27D26]/40 rounded-xl" />
              </div>

              {/* Camera Controls */}
              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-white border border-white/10 flex items-center gap-2 transition-colors active:scale-95"
                >
                  <FlipHorizontal className="w-4 h-4 text-[#F27D26]" />
                  <span>Switch Camera ({facingMode === 'environment' ? 'Back' : 'Front'})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowManualInput(true)}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-white border border-white/10 flex items-center gap-2 transition-colors active:scale-95"
                >
                  <FileText className="w-4 h-4 text-[#FCD34D]" />
                  <span>Presets / Manual</span>
                </button>
              </div>

              <p className="text-[11px] text-white/40 font-mono text-center mt-3">
                Align participant QR code within target frame
              </p>
            </div>
          ) : (
            /* Manual Input & Simulation Presets Mode */
            <div className="w-full space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-[#F27D26]">
                  Quick Simulation Presets (Instant Test)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowManualInput(false);
                    setCameraError(null);
                  }}
                  className="text-xs font-mono text-white/40 hover:text-[#F27D26] flex items-center gap-1"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Back to Camera</span>
                </button>
              </div>

              {/* 4 Realistic Test Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleQuickPreset('paper_and_nontech')}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#F27D26]/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-[#F27D26]">
                    <span>Arun Kumar</span>
                    <span className="font-mono text-[10px] text-[#F27D26]">SYN26-0012</span>
                  </div>
                  <div className="text-[11px] text-white/40 mt-1">
                    Events: Paper Pres. + Non-Tech 1
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickPreset('poster_only')}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#F27D26]/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-[#F27D26]">
                    <span>Pooja Varshini</span>
                    <span className="font-mono text-[10px] text-[#F27D26]">SYN26-0028</span>
                  </div>
                  <div className="text-[11px] text-white/40 mt-1">
                    Events: Poster Making
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickPreset('wrong_event')}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-500/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-red-400">
                    <span>Dinesh (Test Wrong Event)</span>
                    <span className="font-mono text-[10px] text-red-400">SYN26-0035</span>
                  </div>
                  <div className="text-[11px] text-white/40 mt-1">
                    Events: Poster + Non-Tech 2
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickPreset('all_events')}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-emerald-400">
                    <span>Naveen Raj</span>
                    <span className="font-mono text-[10px] text-emerald-400">SYN26-0041</span>
                  </div>
                  <div className="text-[11px] text-white/40 mt-1">
                    Events: Paper Pres. + Poster
                  </div>
                </button>
              </div>

              {/* Paste Raw JSON */}
              <form onSubmit={handleManualSubmit} className="pt-2 border-t border-white/5 space-y-3">
                <div>
                  <label className="block text-xs font-mono text-white/60 mb-1">
                    Or Paste Custom QR Payload (JSON or Key-Value)
                  </label>
                  <textarea
                    rows={3}
                    value={manualPayload}
                    onChange={(e) => setManualPayload(e.target.value)}
                    placeholder='{"uniqueId": "SYN26-0099", "name": "...", "registeredEvents": ["Paper Presentation"]}'
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#F27D26] text-xs font-mono text-white placeholder-white/30 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest text-[#070707] bg-[#F27D26] hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#F27D26]/20"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Process QR Payload</span>
                  </button>

                  {/* Upload QR Image File */}
                  <label className="cursor-pointer py-3 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white flex items-center gap-2">
                    <Upload className="w-3.5 h-3.5 text-[#F27D26]" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-[#070707] border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-white/40">
          <span>Coordinator: {coordinatorName}</span>
          <span className="text-[#F27D26]">Event: {assignedEvent}</span>
        </div>
      </div>
    </div>
  );
};
