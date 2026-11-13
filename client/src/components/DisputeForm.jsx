import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useToast } from './Toast.jsx';
import Modal from './Modal.jsx';
import { resizeImage } from '../utils/resizeImage.js';
import { DISPUTE_CATEGORIES } from '../utils/format.js';

export default function DisputeForm({ tender, onClose, onDone }) {
  const { user, openAuthModal } = useAuth();
  const toast = useToast();
  const [category, setCategory] = useState(DISPUTE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [letter, setLetter] = useState('');

  useEffect(() => {
    if (!user) {
      onClose?.();
      openAuthModal();
    }
  }, [user, onClose, openAuthModal]);

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const resized = await resizeImage(f);
      setPhoto(resized);
      setPreview(URL.createObjectURL(resized));
    } catch {
      toast('Could not process that image file');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!user) {
      onClose?.();
      openAuthModal();
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('category', category);
      form.append('description', description);
      if (photo) form.append('image', photo, 'evidence.jpg');
      const { dispute } = await api.upload(`/tenders/${encodeURIComponent(tender.tenderId)}/disputes`, form);
      setLetter(dispute.letter);
      onDone?.();
      toast('Citizen quality report filed successfully');
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  return (
    <Modal title={`Report Quality Defect: ${tender.tenderId}`} onClose={onClose} wide>
      {letter ? (
        <div className="flex flex-col gap-3 py-2">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <span>✅</span>
            Your quality observation has been recorded
          </div>
          <pre className="letter">{letter}</pre>
          <div className="flex items-center gap-3">
            <button
              className="bg-black hover:bg-slate-800 text-white text-xs font-semibold px-5 py-2.5 rounded-full transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
              onClick={() => {
                navigator.clipboard.writeText(letter);
                toast('Letter copied to clipboard');
              }}
            >
              📋 Copy Formal Letter
            </button>
            <button
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-5 py-2.5 rounded-full transition-all cursor-pointer"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <form className="form flex flex-col gap-4 py-2" onSubmit={submit}>
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Defect Category
            </label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {DISPUTE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              On-Ground Observation (Minimum 20 characters)
            </label>
            <textarea
              rows={4}
              required
              minLength={20}
              maxLength={2000}
              placeholder="Describe what you directly witnessed at the site"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Site Photographic Evidence (Optional)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFile}
              className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
            {preview && (
              <img className="mt-2 max-h-36 rounded-lg border border-slate-200 object-cover" src={preview} alt="Evidence preview" />
            )}
          </div>

          <button
            className="w-full bg-gradient-to-b from-blue-900 to-blue-600 hover:from-blue-950 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-full shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2 text-sm"
            disabled={busy}
          >
            {busy ? 'Submitting & drafting inspection request' : 'Submit Observation & Generate RTI Request'}
          </button>
        </form>
      )}
    </Modal>
  );
}
