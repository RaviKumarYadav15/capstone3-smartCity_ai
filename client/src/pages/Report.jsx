import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import LocationPicker from '../components/LocationPicker.jsx';
import ReportAnalysisModal from '../components/ReportAnalysisModal.jsx';
import { resizeImage } from '../utils/resizeImage.js';
import { CATEGORIES, DEFAULT_CENTER } from '../utils/format.js';
import { FaFileUpload, FaCamera, FaMapMarkerAlt, FaShieldAlt } from 'react-icons/fa';

export default function Report() {
  const { user, loading, openAuthModal } = useAuth();
  const toast = useToast();
  const [aiEnabled, setAiEnabled] = useState(true);
  const [blob, setBlob] = useState(null);
  const [preview, setPreview] = useState(null);
  const [pos, setPos] = useState(DEFAULT_CENTER);
  const [category, setCategory] = useState('Pothole');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [analysisReport, setAnalysisReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [validationError, setValidationError] = useState('');

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

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setValidationError('');
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

  const submit = async (e) => {
    e.preventDefault();
    if (!user) {
      openAuthModal();
      return;
    }
    try {
      const form = new FormData();
      if (blob) form.append('image', blob, 'photo.jpg');
      form.append('lat', pos[0]);
      form.append('lng', pos[1]);
      form.append('category', category);
      if (description.trim()) {
        form.append('description', description.trim());
      }
      const res = await api.upload('/reports', form);

      // Reset form in background so user is left on a clean blank form when the popup closes
      setBlob(null);
      setPreview(null);
      setDescription('');
      setCategory('Pothole');
      setValidationError('');

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
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                  <img className="w-full max-h-64 object-cover" src={preview} alt="Selected civic issue preview" />
                  <div className="p-3 bg-white/95 backdrop-blur-xs border-t border-slate-200 text-xs text-slate-600 flex justify-between items-center">
                    <span className="text-emerald-700 font-semibold">✓ Photo ready for AI verification</span>
                    <label className="text-blue-600 font-bold hover:underline cursor-pointer">
                      Change photo
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickFile} className="hidden" />
                    </label>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => document.getElementById("photoUploadInput").click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-2xl p-7 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 bg-slate-50 group"
                >
                  <FaFileUpload className="text-4xl text-blue-600 mb-1 group-hover:scale-110 transition-transform duration-200" />
                  <input
                    type="file"
                    id="photoUploadInput"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={pickFile}
                    className="hidden"
                  />
                  <p className="text-slate-800 font-bold text-sm m-0">
                    Click to choose or take a photo
                  </p>
                  <p className="text-xs text-slate-500 m-0">
                    Supports JPEG, PNG, or WebP (max 3 MB)
                  </p>
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
              <p className="text-xs text-slate-500 mt-1.5">
                Coordinates: <strong>{pos[0].toFixed(5)}, {pos[1].toFixed(5)}</strong> · Click anywhere on the map to drag the pin
              </p>
            </div>

            {/* Step 3: Category & Description */}
            <div>
              <label className="text-sm font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                <span>Step 3: Issue Category</span>
                <span className="text-xs text-slate-400 font-normal">Select problem type</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                <span>Description {!blob ? '(Required)' : '(Optional)'}</span>
                <span className="text-xs text-slate-400 font-normal">
                  {!blob ? 'Min 10 characters' : 'Add landmarks or notes for field workers'}
                </span>
              </label>
              <textarea
                rows={3}
                minLength={!blob ? 10 : 0}
                maxLength={500}
                required={!blob}
                placeholder={blob ? "Add any extra details, landmarks, or notes (optional)" : "Describe the problem clearly (at least 10 characters)"}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-b from-blue-900 to-blue-600 hover:from-blue-950 hover:to-blue-700 text-white font-bold py-3.5 px-6 rounded-full shadow-md transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-base"
              disabled={busy || (!blob && !description.trim())}
            >
              {busy ? 'Verifying with AI & Saving' : 'Submit Civic Report'}
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
    </div>
  );
}
