import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  X,
  FlipHorizontal,
  AlertCircle,
  FileText,
  Upload,
  Zap,
  CheckCircle2,
  ImageIcon,
} from 'lucide-react';
import {
  parseParticipantQR,
  generateSampleParticipantQR,
  normalizeParticipantObject,
} from '../utils/qrParser';
import { ParticipantQRData } from '../types';

interface QRScannerModalProps {
  isOpen: boolean;
  assignedEvent: string;
  coordinatorName: string;
  onClose: () => void;
  onScanComplete: (participant: ParticipantQRData) => void;
}

// Binarization helper for low-contrast/reflective smartphone screens
function binarizeForContrast(imgData: ImageData): Uint8ClampedArray {
  const data = imgData.data;
  const len = data.length;
  const output = new Uint8ClampedArray(len);

  let sum = 0;
  let samples = 0;
  for (let i = 0; i < len; i += 32) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    samples++;
  }
  const threshold = samples > 0 ? sum / samples : 128;

  for (let i = 0; i < len; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const val = lum > threshold ? 255 : 0;
    output[i] = val;
    output[i + 1] = val;
    output[i + 2] = val;
    output[i + 3] = 255;
  }
  return output;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  assignedEvent,
  coordinatorName,
  onClose,
  onScanComplete,
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isDetected, setIsDetected] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualPayload, setManualPayload] = useState('');
  const [isDecodingFile, setIsDecodingFile] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const barcodeDetectorRef = useRef<any>(null);
  const frameCountRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isProcessingRef = useRef<boolean>(false);
  const lastScannedTextRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  // Initialize native BarcodeDetector if browser/device supports it
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetectorRef.current = new (window as any).BarcodeDetector({
          formats: ['qr_code'],
        });
      } catch {
        barcodeDetectorRef.current = null;
      }
    }
  }, []);

  // Central Multi-Pass QR Decoder
  const detectQRCodeFromCanvas = async (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): Promise<string | null> => {
    // Pass 1: Native hardware-accelerated BarcodeDetector (Chrome, Android, Chromium)
    if (barcodeDetectorRef.current) {
      try {
        const barcodes = await barcodeDetectorRef.current.detect(canvas);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          return barcodes[0].rawValue;
        }
      } catch {
        // Fall through to jsQR
      }
    }

    // Pass 2: High-accuracy full-frame jsQR with inverted check (handles tilts, angles & dark mode)
    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const code = jsQR(imageData.data, width, height, {
        inversionAttempts: 'attemptBoth',
      });
      if (code && code.data && code.data.trim()) {
        return code.data;
      }

      // Pass 3: Multi-Scale Center-Crop for distant or small QR codes on 720p/1080p feeds
      if (width >= 600 && height >= 450) {
        const cropW = Math.floor(width * 0.65);
        const cropH = Math.floor(height * 0.65);
        const cropX = Math.floor((width - cropW) / 2);
        const cropY = Math.floor((height - cropH) / 2);
        const cropData = ctx.getImageData(cropX, cropY, cropW, cropH);
        const cropCode = jsQR(cropData.data, cropW, cropH, {
          inversionAttempts: 'attemptBoth',
        });
        if (cropCode && cropCode.data && cropCode.data.trim()) {
          return cropCode.data;
        }
      }

      // Pass 4: Adaptive contrast enhancement for screen glare / washed-out mobile displays
      frameCountRef.current = (frameCountRef.current + 1) % 60;
      if (frameCountRef.current % 2 === 0) {
        const thresholded = binarizeForContrast(imageData);
        const contrastCode = jsQR(thresholded, width, height, {
          inversionAttempts: 'dontInvert',
        });
        if (contrastCode && contrastCode.data && contrastCode.data.trim()) {
          return contrastCode.data;
        }
      }
    } catch {
      // ignore frame analysis error
    }

    return null;
  };

  // Immediate payload processing & concurrency locking
  const handleDecodedText = async (decodedText: string) => {
    if (isProcessingRef.current) return;

    const now = Date.now();
    // Debounce rapid duplicate triggers within 2.5 seconds
    if (decodedText === lastScannedTextRef.current && now - lastScannedTimeRef.current < 2500) {
      return;
    }

    isProcessingRef.current = true;
    lastScannedTextRef.current = decodedText;
    lastScannedTimeRef.current = now;

    // Immediately stop camera tracks and animation frame loop
    stopCamera();

    // Haptic vibration feedback (UPI style)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(60);
      } catch {}
    }

    // Visual green feedback
    setIsDetected(true);

    try {
      let participant = parseParticipantQR(decodedText);
      if (!participant) {
        // Fallback placeholder so existing Attendance API handles validation
        participant = normalizeParticipantObject({
          unique_id: 'INVALID_PAYLOAD',
          uniqueId: 'INVALID_PAYLOAD',
          name: 'Unrecognized QR Payload',
        });
      }

      // Brief 120ms pause for visual feedback before opening attendance result modal
      await new Promise((resolve) => setTimeout(resolve, 120));
      onScanComplete(participant);
    } catch (err: any) {
      console.error('Error handling decoded QR:', err);
      isProcessingRef.current = false;
      setIsDetected(false);
      setCameraError('Failed to parse QR code: ' + (err.message || 'Unknown error'));
    }
  };

  // Continuous frame scanning loop (30-60 FPS)
  const scanLoop = async () => {
    if (isProcessingRef.current) return;

    const video = videoRef.current;
    if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      const width = video.videoWidth;
      const height = video.videoHeight;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const decoded = await detectQRCodeFromCanvas(canvas, ctx, width, height);

        if (decoded && !isProcessingRef.current) {
          handleDecodedText(decoded);
          return;
        }
      }
    }

    // Keep scanning continuously without any timeout or error
    if (!isProcessingRef.current) {
      animationFrameRef.current = requestAnimationFrame(scanLoop);
    }
  };

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    setIsDetected(false);
    isProcessingRef.current = false;

    // Stop any existing tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    try {
      let stream: MediaStream;
      try {
        // Preferred high-resolution mobile camera constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback for devices that reject specific resolution or facingMode constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Kick off continuous scanning loop
      animationFrameRef.current = requestAnimationFrame(scanLoop);
    } catch (err: any) {
      console.warn('Camera start error:', err);
      isProcessingRef.current = false;
      setCameraError(
        'Unable to start camera preview. Please verify camera permissions or use "Scan from Image" below.'
      );
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Lifecycle handler
  useEffect(() => {
    if (isOpen && !showManualInput) {
      isProcessingRef.current = false;
      setIsDetected(false);
      setCameraError(null);
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, showManualInput]);

  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  // Fallback: Scan from Image file (Gallery / File upload)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsDecodingFile(true);
      setCameraError(null);

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Unable to read selected image file.'));
        img.src = objectUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        setCameraError('Browser canvas initialization failed.');
        setIsDecodingFile(false);
        return;
      }

      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl);

      // Attempt decoding across multi-detector pipeline
      let decoded = await detectQRCodeFromCanvas(canvas, ctx, canvas.width, canvas.height);

      // Downscale pass for high-megapixel images (e.g. 20-50MP phone camera uploads)
      if (!decoded && (canvas.width > 1200 || canvas.height > 1200)) {
        const scale = Math.min(1000 / canvas.width, 1000 / canvas.height);
        const scaledCanvas = document.createElement('canvas');
        scaledCanvas.width = Math.round(canvas.width * scale);
        scaledCanvas.height = Math.round(canvas.height * scale);
        const scaledCtx = scaledCanvas.getContext('2d', { willReadFrequently: true });
        if (scaledCtx) {
          scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
          decoded = await detectQRCodeFromCanvas(
            scaledCanvas,
            scaledCtx,
            scaledCanvas.width,
            scaledCanvas.height
          );
        }
      }

      // Final fallback using Html5Qrcode file scan
      if (!decoded) {
        try {
          const fallbackQr = new Html5Qrcode('syntronix-fallback-reader');
          decoded = await fallbackQr.scanFile(file, true);
        } catch {
          // ignore
        }
      }

      setIsDecodingFile(false);

      if (decoded) {
        handleDecodedText(decoded);
      } else {
        setCameraError('No readable QR code found in selected image. Please try a clearer picture.');
      }
    } catch (err: any) {
      setIsDecodingFile(false);
      setCameraError('Error decoding image file: ' + (err.message || 'Unknown error'));
    } finally {
      // Reset input value so same file can be re-selected if needed
      if (e.target) e.target.value = '';
    }
  };

  // Quick Presets
  const handleQuickPreset = (
    preset: 'paper_and_nontech' | 'poster_only' | 'wrong_event' | 'all_events'
  ) => {
    const raw = generateSampleParticipantQR(preset);
    handleDecodedText(raw);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPayload.trim()) return;
    handleDecodedText(manualPayload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      {/* Hidden container for Html5Qrcode file fallback if needed */}
      <div id="syntronix-fallback-reader" className="hidden" />

      <div className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top accent line */}
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
                <p className="font-semibold">Notice</p>
                <p className="mt-0.5 text-white/70">{cameraError}</p>
              </div>
            </div>
          )}

          {!showManualInput ? (
            <div className="w-full flex flex-col items-center">
              {/* Full-Frame Edge-to-Edge Camera Viewfinder */}
              <div
                className={`relative w-full max-w-[360px] sm:max-w-[390px] aspect-square rounded-2xl overflow-hidden bg-black border-2 transition-all duration-300 shadow-2xl flex items-center justify-center ${
                  isDetected
                    ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)]'
                    : 'border-white/10'
                }`}
              >
                {/* Real-time HTML5 Camera Video Stream */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  autoPlay
                  muted
                />

                {/* Top Badge: Continuous Live Scan Active */}
                <div className="pointer-events-none absolute top-3 inset-x-0 flex justify-center z-10">
                  <div className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-mono text-white/90 flex items-center gap-1.5 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Auto-Detect Active • Any Angle</span>
                  </div>
                </div>

                {/* Corner Reticles (Non-confining styling guide) */}
                <div className="pointer-events-none absolute inset-5 sm:inset-6">
                  <div className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-[#F27D26] rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-[#F27D26] rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-[#F27D26] rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-[#F27D26] rounded-br-lg" />
                </div>

                {/* Continuous Laser Scan Line */}
                {!isDetected && (
                  <div className="pointer-events-none absolute inset-x-6 h-0.5 bg-gradient-to-r from-transparent via-[#F27D26] to-transparent shadow-[0_0_14px_#F27D26] animate-scan-laser z-10" />
                )}

                {/* Instant Detection Feedback Overlay */}
                {isDetected && (
                  <div className="pointer-events-none absolute inset-0 bg-emerald-500/15 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 z-20">
                    <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-black shadow-lg shadow-emerald-500/40">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <span className="px-3.5 py-1.5 rounded-full bg-black/80 font-mono text-xs font-bold text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                      QR Detected • Processing...
                    </span>
                  </div>
                )}
              </div>

              {/* Action Controls: Switch Camera, Scan from Image, Presets */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-white border border-white/10 flex items-center gap-2 transition-colors active:scale-95"
                >
                  <FlipHorizontal className="w-3.5 h-3.5 text-[#F27D26]" />
                  <span>Camera ({facingMode === 'environment' ? 'Back' : 'Front'})</span>
                </button>

                {/* Fallback Option: Scan from Image */}
                <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-white border border-white/10 flex items-center gap-2 transition-colors active:scale-95">
                  <ImageIcon className="w-3.5 h-3.5 text-[#FCD34D]" />
                  <span>{isDecodingFile ? 'Decoding...' : 'Scan from Image'}</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setShowManualInput(true)}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-white border border-white/10 flex items-center gap-2 transition-colors active:scale-95"
                >
                  <FileText className="w-3.5 h-3.5 text-white/60" />
                  <span>Manual / Presets</span>
                </button>
              </div>

              <p className="text-[11px] text-white/50 font-mono text-center mt-3 flex items-center justify-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>Continuous detection at any distance, tilt, or angle</span>
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
                    Or Paste Custom QR Payload (JSON, URL, or ID)
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
