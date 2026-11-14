import { useEffect, useRef, useState } from 'react';
import { FaCamera, FaSync, FaTimes } from 'react-icons/fa';

export default function CameraModal({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' for rear, 'user' for front
  const [loading, setLoading] = useState(true);
  const [cameraError, setCameraError] = useState('');

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async (mode) => {
    setLoading(true);
    setCameraError('');
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported on this browser or connection');
      }

      const constraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setLoading(false);
    } catch (err) {
      console.warn('Camera error:', err);
      setLoading(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in browser settings.');
      } else {
        setCameraError(err.message || 'Unable to start camera.');
      }
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          stopCamera();
          onCapture(blob);
        }
      },
      'image/jpeg',
      0.92
    );
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col relative text-white">
        {/* Header */}
        <div className="p-4 px-5 flex items-center justify-between border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <FaCamera className="text-blue-400 text-lg" />
            <span className="font-bold text-sm tracking-wide text-white">Live Camera Viewfinder</span>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Close camera"
          >
            <FaTimes />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative bg-black w-full aspect-4/3 flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center max-w-xs text-red-300 flex flex-col items-center gap-3">
              <span className="text-3xl">⚠️</span>
              <p className="text-xs sm:text-sm">{cameraError}</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="mt-2 text-xs font-semibold px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-full text-white cursor-pointer border border-slate-700"
              >
                Retry Camera
              </button>
            </div>
          ) : (
            <>
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10">
                  <span className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></span>
                  <span className="text-xs text-slate-300 mt-2">Starting camera...</span>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Reticle Framing */}
              <div className="absolute inset-6 pointer-events-none border border-white/20 rounded-2xl flex flex-col justify-between p-3">
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-white/80 rounded-tl-sm"></div>
                  <div className="w-4 h-4 border-t-2 border-r-2 border-white/80 rounded-tr-sm"></div>
                </div>
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-white/80 rounded-bl-sm"></div>
                  <div className="w-4 h-4 border-b-2 border-r-2 border-white/80 rounded-br-sm"></div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Controls Footer */}
        <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 flex items-center justify-around">
          {/* Flip Camera button */}
          <button
            type="button"
            onClick={toggleFacingMode}
            disabled={loading || Boolean(cameraError)}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition disabled:opacity-30 cursor-pointer"
            title="Switch front / rear camera"
          >
            <div className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-sm">
              <FaSync />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider">Flip</span>
          </button>

          {/* Shutter Button */}
          <button
            type="button"
            onClick={handleCapture}
            disabled={loading || Boolean(cameraError)}
            className="w-16 h-16 rounded-full bg-white p-1 shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100 cursor-pointer flex items-center justify-center"
            title="Capture photo"
          >
            <div className="w-full h-full rounded-full border-2 border-slate-900 bg-gradient-to-b from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl">
              <FaCamera />
            </div>
          </button>

          {/* Cancel button */}
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-sm">
              <FaTimes />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider">Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
}
