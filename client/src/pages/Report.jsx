import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import LocationPicker from '../components/LocationPicker.jsx';
import ReportAnalysisModal from '../components/ReportAnalysisModal.jsx';
import CameraModal from '../components/CameraModal.jsx';
import { resizeImage } from '../utils/resizeImage.js';
import { reverseGeocode } from '../utils/geocode.js';
import { CATEGORIES, DEFAULT_CENTER } from '../utils/format.js';
import {
  FaFileUpload,
  FaCamera,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaMicrophone,
  FaMicrophoneSlash,
  FaMagic,
  FaEdit,
} from 'react-icons/fa';

export default function Report() {
  const { user, loading, openAuthModal } = useAuth();
  const toast = useToast();
  const [aiEnabled, setAiEnabled] = useState(true);
  const [blob, setBlob] = useState(null);
  const [preview, setPreview] = useState(null);
  const [pos, setPos] = useState(DEFAULT_CENTER);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [analysisReport, setAnalysisReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [aiDraftGenerated, setAiDraftGenerated] = useState(false);
  const [imageVerification, setImageVerification] = useState(null);
  const [verifyingPhoto, setVerifyingPhoto] = useState(false);
  const [address, setAddress] = useState({
    area: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    formatted: '',
  });
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);

  const recognitionRef = useRef(null);
  const descTextareaRef = useRef(null);

  const features = [
    {
      icon: <FaCamera className="text-blue-600 text-lg" />,
      title: 'Smart AI Image Inspection',
      desc: 'Validates authenticity, identifies damage, and assigns priority',
    },
    {
      icon: <FaMapMarkerAlt className="text-blue-600 text-lg" />,
      title: 'Precise GPS Geo-Tagging',
      desc: 'Pins the exact location on the live city infrastructure map',
    },
    {
      icon: <FaShieldAlt className="text-blue-600 text-lg" />,
      title: 'Citizen Consensus & Action',
      desc: 'Peer verifications automatically escalate issue to authorities',
    },
  ];

  useEffect(() => {
    api.get('/config').then((c) => setAiEnabled(c.aiEnabled)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      openAuthModal();
    }
  }, [loading, user, openAuthModal]);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    setIsResolvingAddress(true);
    const timeout = setTimeout(async () => {
      try {
        const geo = await reverseGeocode(pos[0], pos[1]);
        if (active && geo) {
          setAddress(geo);
        }
      } catch (err) {
        console.warn('Geocoding lookup error:', err);
      } finally {
        if (active) setIsResolvingAddress(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [pos[0], pos[1]]);

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setValidationError('');
    setImageVerification(null);
    try {
      const b = await resizeImage(file);
      setBlob(b);
      setPreview(URL.createObjectURL(b));
    } catch {
      toast('That file is not a readable image');
    }
  };

  const removePhoto = () => {
    setBlob(null);
    setPreview(null);
    setValidationError('');
    setImageVerification(null);
  };

  const handleCameraCapture = async (capturedBlob) => {
    try {
      const b = await resizeImage(capturedBlob);
      setBlob(b);
      setPreview(URL.createObjectURL(b));
      setShowCameraModal(false);
      setValidationError('');
      setImageVerification(null);
      toast.success('Live photo captured from camera');
    } catch {
      toast.error('Could not process captured camera image');
    }
  };

  const handleVerifyPhoto = async () => {
    if (!blob) {
      toast.error('Please upload or take a photo first');
      return;
    }
    if (!user) {
      openAuthModal();
      return;
    }
    setVerifyingPhoto(true);
    setValidationError('');
    try {
      const fd = new FormData();
      fd.append('image', blob, 'issue.jpg');
      const res = await api.upload('/reports/describe', fd);
      if (res.isValid === false) {
        const reason = res.rejectionReason || 'The photo does not appear to show a valid civic infrastructure issue.';
        setImageVerification({ isValid: false, rejectionReason: reason });
        setValidationError(reason);
        toast.error('Photo rejected by AI inspector');
      } else {
        setImageVerification({
          isValid: true,
          category: res.category,
          severity: res.severity,
          department: res.department,
          priority: res.priority,
        });
        if (res.category) {
          setCategory(res.category);
        }
        if (res.description) {
          setDescription(res.description);
          setAiDraftGenerated(true);
        }
        setValidationError('');
        toast.success(`Photo verified! Detected ${res.category} (${res.severity} severity)`);
      }
    } catch (err) {
      const msg = err.message || 'Failed to verify photo with AI';
      setValidationError(msg);
      setImageVerification({ isValid: false, rejectionReason: msg });
      toast.error(msg);
    } finally {
      setVerifyingPhoto(false);
    }
  };

  const detect = () => {
    if (!navigator.geolocation) return toast('Geolocation is not supported on this device');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos([p.coords.latitude, p.coords.longitude]);
        toast('Location pin updated to your GPS coordinates');
      },
      () => toast('Could not get GPS location — click the map to place the pin'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice dictation is not supported by your current browser. Please try Google Chrome, Microsoft Edge, or Safari.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = navigator.language || 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        toast.success('🎙️ Microphone active: speak clearly to describe the issue');
      };

      recognition.onresult = (event) => {
        let transcriptChunk = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcriptChunk += event.results[i][0].transcript;
          }
        }
        if (transcriptChunk) {
          setDescription((prev) => {
            const trimmed = prev.trim();
            const addition = transcriptChunk.trim();
            const merged = trimmed ? `${trimmed} ${addition}` : addition;
            return merged.slice(0, 500);
          });
          setTimeout(() => descTextareaRef.current?.focus(), 100);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          toast.error('Microphone access was denied. Please allow microphone permissions in browser settings.');
        } else if (event.error !== 'no-speech') {
          toast.error(`Voice recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech start error:', err);
      toast.error('Could not initialize speech recognition');
      setIsListening(false);
    }
  };

  const handleGenerateAiDescription = async () => {
    if (!blob) {
      toast.error('Please upload or take a photo first');
      return;
    }
    if (!user) {
      openAuthModal();
      return;
    }
    setGeneratingDesc(true);
    setValidationError('');
    try {
      const fd = new FormData();
      fd.append('image', blob, 'issue.jpg');
      const res = await api.upload('/reports/describe', fd);
      if (res.description) {
        setDescription(res.description);
        setAiDraftGenerated(true);
        setTimeout(() => descTextareaRef.current?.focus(), 150);
      }
      if (res.category && (!category || category === '')) {
        setCategory(res.category);
      }
      toast.success(`AI generated description & detected category (${res.category})`);
    } catch (err) {
      const msg = err.message || 'Failed to analyze photo with AI';
      setValidationError(msg);
      toast.error(msg);
    } finally {
      setGeneratingDesc(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!user) {
      openAuthModal();
      return;
    }
    if (!blob && !category) {
      toast.error('Please select an issue category');
      return;
    }
    if (!blob && !description.trim()) {
      toast.error('Please describe the issue or attach a photo');
      return;
    }
    setBusy(true);
    setValidationError('');
    try {
      const form = new FormData();
      if (blob) form.append('image', blob, 'photo.jpg');
      form.append('lat', pos[0]);
      form.append('lng', pos[1]);
      if (address) {
        form.append('address', JSON.stringify(address));
        if (address.area) form.append('area', address.area);
        if (address.city) form.append('city', address.city);
        if (address.state) form.append('state', address.state);
        if (address.country) form.append('country', address.country);
        if (address.pincode) form.append('pincode', address.pincode);
        if (address.formatted) form.append('formattedAddress', address.formatted);
      }
      if (category) form.append('category', category);
      if (description.trim()) {
        form.append('description', description.trim());
      }
      const res = await api.upload('/reports', form);

      // Reset form in background so user is left on a clean blank form when the popup closes
      setBlob(null);
      setPreview(null);
      setDescription('');
      setCategory('');
      setValidationError('');
      setAiDraftGenerated(false);
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        setIsListening(false);
      }

      // Open immediate analysis report popup
      setAnalysisReport(res.report);
      setShowModal(true);
      toast.success('Civic report filed & verified');
    } catch (err) {
      setValidationError(err.message);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full">
      <section className="bg-white rounded-3xl shadow-sm border border-slate-200/90 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Left Side: Info with Tricolor Gradient */}
        <div className="md:col-span-5 relative bg-gradient-to-br from-orange-200 via-white to-green-200 p-8 sm:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200/80">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-3 leading-tight">
              Report a <br className="hidden sm:inline" />Civic Issue
            </h1>
            <p className="text-slate-600 mb-8 text-sm leading-relaxed">
              Upload photo evidence of municipal defects — AI will verify authenticity, assign priority, and route directly to the responsible civic agency
            </p>

            <div className="space-y-4">
              {features.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-4 bg-white/95 backdrop-blur-xs p-4 rounded-2xl shadow-2xs border border-slate-100 hover:bg-white transition-all"
                >
                  <div className="bg-blue-50 text-blue-600 p-3 rounded-xl text-lg shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <span className="text-slate-800 font-bold block text-sm">
                      {item.title}
                    </span>
                    <span className="text-slate-500 text-xs">
                      {item.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-300/40 text-xs text-slate-500">
            ⚡ AI vision analysis helps prevent spurious complaints and accelerates field repairs
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="md:col-span-7 p-6 sm:p-10 bg-white flex flex-col justify-center">
          {validationError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <div>
                <strong className="font-bold">Image Validation Notice:</strong>
                <p className="mt-0.5">{validationError}</p>
              </div>
            </div>
          )}

          <form onSubmit={submit} className="form flex flex-col gap-6">
            {/* Step 1: Photo Evidence */}
            <div>
              <label className="text-sm font-bold text-slate-800 flex justify-between items-center mb-2">
                <span>Step 1: Photo Evidence {!aiEnabled && '(Optional)'}</span>
                {preview && (
                  <button type="button" onClick={removePhoto} className="text-xs text-red-600 hover:underline font-semibold cursor-pointer">
                    Remove photo
                  </button>
                )}
              </label>

              {preview ? (
                <div className="flex flex-col gap-2.5">
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img className="w-full max-h-64 object-cover" src={preview} alt="Selected civic issue preview" />
                    <div className="p-3 bg-white/95 backdrop-blur-xs border-t border-slate-200 text-xs text-slate-600 flex justify-between items-center flex-wrap gap-2">
                      <span className="text-slate-700 font-semibold flex items-center gap-1.5">
                        <FaCamera className="text-blue-600" /> Photo Attached
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setShowCameraModal(true)}
                          className="text-blue-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <FaCamera className="text-xs" /> Retake
                        </button>
                        <label className="text-slate-600 font-bold hover:underline cursor-pointer">
                          Upload different
                          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickFile} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Immediate Photo Verification Status & Trigger Button */}
                  {imageVerification?.isValid === true ? (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-start gap-2.5">
                        <span className="text-lg">✅</span>
                        <div>
                          <span className="font-bold block text-emerald-800 text-sm">
                            Photo Verified by AI as Civic Issue
                          </span>
                          <span className="text-emerald-700 block mt-0.5">
                            Category: <strong>{imageVerification.category}</strong> · Severity: <strong>{imageVerification.severity}</strong> · Assigned: <strong>{imageVerification.department}</strong>
                          </span>
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Verified Valid
                      </span>
                    </div>
                  ) : imageVerification?.isValid === false ? (
                    <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-900 flex flex-col gap-2 shadow-2xs">
                      <div className="flex items-start gap-2.5">
                        <span className="text-lg">❌</span>
                        <div>
                          <span className="font-bold block text-red-800 text-sm">
                            Photo Verification Failed
                          </span>
                          <p className="mt-0.5 text-red-700 m-0 leading-relaxed">
                            {imageVerification.rejectionReason || 'The photo does not show a public infrastructure defect.'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1 border-t border-red-200/60">
                        <button
                          type="button"
                          onClick={() => setShowCameraModal(true)}
                          className="text-xs font-bold px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer transition shadow-2xs"
                        >
                          📸 Retake Photo
                        </button>
                        <button
                          type="button"
                          onClick={handleVerifyPhoto}
                          disabled={verifyingPhoto}
                          className="text-xs font-semibold px-3 py-1.5 bg-white border border-red-300 hover:bg-red-50 text-red-800 rounded-lg cursor-pointer transition"
                        >
                          🔄 Retry Verification
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 flex-wrap shadow-2xs">
                      <div className="text-xs text-blue-900 flex items-center gap-2">
                        <span className="text-base">⚡</span>
                        <span>
                          <strong>Check authenticity upfront:</strong> Verify this photo with AI before completing the form
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleVerifyPhoto}
                        disabled={verifyingPhoto || busy}
                        className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 ml-auto"
                      >
                        {verifyingPhoto ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            <span>Verifying Photo...</span>
                          </>
                        ) : (
                          <>
                            <FaMagic className="text-xs" />
                            <span>Verify Photo with AI</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Option 1: Live Camera Viewfinder */}
                  <div
                    onClick={() => setShowCameraModal(true)}
                    className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/80 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group shadow-2xs hover:shadow-xs"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl group-hover:scale-110 transition-transform shadow-xs">
                      <FaCamera />
                    </div>
                    <div>
                      <p className="text-slate-900 font-bold text-sm m-0">
                        Take Live Photo
                      </p>
                      <p className="text-xs text-slate-500 m-0 mt-0.5">
                        Direct in-app camera viewfinder
                      </p>
                    </div>
                  </div>

                  {/* Option 2: Upload from Gallery/Device */}
                  <div
                    onClick={() => document.getElementById("photoUploadInput").click()}
                    className="border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100/70 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group shadow-2xs hover:shadow-xs"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-700 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                      <FaFileUpload />
                    </div>
                    <input
                      type="file"
                      id="photoUploadInput"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={pickFile}
                      className="hidden"
                    />
                    <div>
                      <p className="text-slate-800 font-bold text-sm m-0">
                        Upload Photo
                      </p>
                      <p className="text-xs text-slate-500 m-0 mt-0.5">
                        JPEG, PNG, WebP from files
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Location Picker */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-800">Step 2: Incident Location</span>
                <button
                  type="button"
                  className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  onClick={detect}
                >
                  📍 Detect My Location
                </button>
              </div>
              <LocationPicker position={pos} onPick={setPos} />

              {/* Coordinates and Resolved Address Box */}
              <div className="mt-2.5 p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-col gap-2.5 text-xs text-slate-700 shadow-2xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                    <span className="font-semibold text-slate-800">GPS Coordinates:</span>
                    <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 font-bold text-slate-900">
                      {pos[0].toFixed(5)}, {pos[1].toFixed(5)}
                    </span>
                  </div>
                  {isResolvingAddress ? (
                    <span className="flex items-center gap-1.5 text-blue-600 font-semibold text-[11px] animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                      Resolving address from coordinates...
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider">
                      ✓ Address Resolved
                    </span>
                  )}
                </div>

                {/* Structured Address Badges: Area, City, State, Country */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200/70">
                  <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Area / Locality</span>
                    <span className="font-semibold text-slate-800 text-xs truncate block" title={address?.area || 'Resolving...'}>
                      {address?.area || '—'}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">City / Town</span>
                    <span className="font-semibold text-slate-800 text-xs truncate block" title={address?.city || 'Resolving...'}>
                      {address?.city || '—'}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">State</span>
                    <span className="font-semibold text-slate-800 text-xs truncate block" title={address?.state || 'Resolving...'}>
                      {address?.state || '—'}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Country (PIN)</span>
                    <span className="font-semibold text-slate-800 text-xs truncate block" title={`${address?.country || ''} ${address?.pincode ? `(${address.pincode})` : ''}`}>
                      {address?.country ? `${address.country} ${address?.pincode ? `(${address.pincode})` : ''}` : '—'}
                    </span>
                  </div>
                </div>

                {address?.formatted && (
                  <div className="text-[11px] text-slate-600 bg-white/80 px-2.5 py-1.5 rounded-lg border border-slate-200/60 leading-relaxed">
                    <strong className="text-slate-800 font-semibold">Full Address: </strong>
                    <span>{address.formatted}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Category & Description */}
            <div>
              <label className="text-sm font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                <span>Step 3: Issue Category {!blob && '(Required)'}</span>
                <span className="text-xs text-slate-400 font-normal">
                  {blob ? 'Optional (AI auto-detects from photo)' : 'Select problem type'}
                </span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required={!blob}
                className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="">-- Select an Issue Category --</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label className="text-sm font-bold text-slate-800">
                  Step 4: Issue Description {!blob ? '(Required)' : '(Optional)'}
                </label>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Voice Dictation Button */}
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse border border-red-600 shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:text-slate-900'
                    }`}
                    title={isListening ? 'Click to stop listening' : 'Dictate your description by speaking'}
                  >
                    {isListening ? (
                      <>
                        <FaMicrophoneSlash className="text-xs" />
                        <span>Listening... (Tap to stop)</span>
                      </>
                    ) : (
                      <>
                        <FaMicrophone className="text-xs text-red-500" />
                        <span>Voice Dictate</span>
                      </>
                    )}
                  </button>

                  {/* AI Generate Button */}
                  {blob && (
                    <button
                      type="button"
                      onClick={handleGenerateAiDescription}
                      disabled={generatingDesc || busy}
                      className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50"
                      title="Ask Gemini AI to analyze the photo and draft an infrastructure description"
                    >
                      {generatingDesc ? (
                        <>
                          <span className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></span>
                          <span>Generating with AI...</span>
                        </>
                      ) : (
                        <>
                          <FaMagic className="text-blue-600 text-xs" />
                          <span>Generate with AI</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* AI Draft helper banner with manual editing action */}
              {aiDraftGenerated && description && (
                <div className="mb-2 p-2.5 px-3.5 bg-blue-50 border border-blue-200/90 rounded-xl text-xs text-blue-900 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <FaEdit className="text-blue-600 shrink-0 text-sm" />
                    <span>
                      <strong>AI Draft Loaded:</strong> The text below is editable — click to add street landmarks or speak.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => {
                        descTextareaRef.current?.focus();
                        const len = descTextareaRef.current?.value.length || 0;
                        descTextareaRef.current?.setSelectionRange(len, len);
                      }}
                      className="text-blue-700 font-bold bg-white border border-blue-300 hover:bg-blue-100 px-2.5 py-1 rounded-lg text-xs cursor-pointer shadow-2xs"
                    >
                      ✏️ Edit Text
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Reset and clear description text?')) {
                          setDescription('');
                          setAiDraftGenerated(false);
                        }
                      }}
                      className="text-slate-400 hover:text-red-600 text-[11px] underline cursor-pointer"
                      title="Clear and reset text"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}

              {/* Listening feedback indicator */}
              {isListening && (
                <div className="mb-2 p-2.5 px-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2 animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                  <span className="font-semibold">Microphone is listening... Speak clearly into your device</span>
                </div>
              )}

              <textarea
                ref={descTextareaRef}
                rows={3}
                minLength={!blob ? 10 : 0}
                maxLength={500}
                required={!blob}
                placeholder={
                  blob
                    ? "Add custom notes, click 'Voice Dictate' to speak, or 'Generate with AI' to draft from photo..."
                    : "Describe the problem clearly (at least 10 characters)..."
                }
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (!e.target.value) setAiDraftGenerated(false);
                }}
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />

              <div className="flex justify-between items-center text-xs text-slate-400 mt-1 px-1">
                <span>
                  {description.length > 0 ? (
                    <span className="text-slate-600 font-medium">{description.length} / 500 characters</span>
                  ) : (
                    'Maximum 500 characters'
                  )}
                </span>
                {description.length >= 450 && (
                  <span className="text-amber-600 font-semibold">Approaching limit</span>
                )}
                {description.length > 0 && !aiDraftGenerated && (
                  <button
                    type="button"
                    onClick={() => setDescription('')}
                    className="text-slate-400 hover:text-red-500 text-xs cursor-pointer ml-auto"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-b from-blue-900 to-blue-600 hover:from-blue-950 hover:to-blue-700 text-white font-bold py-3.5 px-6 rounded-full shadow-md transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-base flex items-center justify-center gap-2"
              disabled={busy || generatingDesc || (!blob && (!category || !description.trim()))}
            >
              {busy ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Verifying with AI & Submitting Report...</span>
                </>
              ) : (
                <span>Submit Civic Report</span>
              )}
            </button>
          </form>
        </div>
      </section>

      {showModal && analysisReport && (
        <ReportAnalysisModal
          report={analysisReport}
          onClose={() => {
            setShowModal(false);
            setAnalysisReport(null);
          }}
        />
      )}

      {showCameraModal && (
        <CameraModal
          onCapture={handleCameraCapture}
          onClose={() => setShowCameraModal(false)}
        />
      )}
    </div>
  );
}
