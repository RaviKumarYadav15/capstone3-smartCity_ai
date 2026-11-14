import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import TenderModal from '../components/TenderModal.jsx';
import DisputeForm from '../components/DisputeForm.jsx';
import VoiceInputButton from '../components/VoiceInputButton.jsx';
import { formatINR, formatDate, statusLabel } from '../utils/format.js';

const FILTERS = [
  ['all', 'All Tenders'],
  ['sanctioned', 'Sanctioned'],
  ['in_progress', 'In Progress'],
  ['completed', 'Completed'],
  ['disputed', 'Citizen Observations Filed'],
];

const EMPTY = {
  tenderId: '',
  title: '',
  budget: '',
  department: 'Public Works Department (PWD)',
  contractor: '',
  location: '',
  deadline: '',
  warranty: '36 months defect liability',
  specs: '',
};

export default function Tenders() {
  const { user, openAuthModal } = useAuth();
  const toast = useToast();
  const [tenders, setTenders] = useState([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(null);
  const [disputeFor, setDisputeFor] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const canPublish = user && ['authority', 'admin'].includes(user.role);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (filter === 'disputed') params.set('disputed', 'true');
    else if (filter !== 'all') params.set('status', filter);
    try {
      const res = await api.get(`/tenders?${params}`);
      setTenders(res.tenders);
    } catch (e) {
      toast(e.message);
    }
  }, [q, filter, toast]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const publish = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
      const { tender } = await api.post('/tenders', body);
      setForm(EMPTY);
      setShowForm(false);
      await load();
      setOpen(tender.tenderId);
      toast('Public tender published successfully');
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 m-0">Public Works Tender Monitor</h1>
          </div>
          {canPublish && (
            <button
              className="bg-black hover:bg-slate-800 text-white font-semibold px-6 py-2.5 rounded-full transition-all text-sm cursor-pointer shadow-xs"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? '✕ Cancel' : '＋ Publish New Tender'}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <div className="relative flex-1 min-w-[240px] flex items-center">
            <input
              className="search py-2.5 pl-4 pr-32 text-sm rounded-full border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full"
              type="search"
              placeholder="Search tender ID, title, contractor, department"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search tenders"
            />
            <div className="absolute right-2">
              <VoiceInputButton
                onTranscript={(text) => setQ((prev) => (prev ? `${prev} ${text}` : text))}
                title="Voice search tenders"
              />
            </div>
          </div>
          <div className="pills flex flex-wrap gap-1.5">
            {FILTERS.map(([k, label]) => (
              <button
                key={k}
                className={`pill text-xs font-semibold py-1.5 px-3.5 rounded-full border transition-all ${
                  filter === k
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                onClick={() => setFilter(k)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Publish Tender Form for Authority / Admin */}
      {showForm && (
        <form className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm form grid two gap-4" onSubmit={publish}>
          <div className="full border-b border-slate-100 pb-2 mb-1">
            <h2 className="text-lg font-bold text-slate-900 m-0">Publish Official Public Works Tender</h2>
          </div>
          <label>
            Tender Identification Number (e.g. TN-PWD-2026-T900)
            <input required value={form.tenderId} onChange={set('tenderId')} placeholder="TN-PWD-2026-T900" />
          </label>
          <label>
            Project Title
            <input required minLength={5} value={form.title} onChange={set('title')} placeholder="4-Lane Bituminous Overlay" />
          </label>
          <label>
            Sanctioned Budget (₹ INR)
            <input required type="number" min={1} value={form.budget} onChange={set('budget')} placeholder="5000000" />
          </label>
          <label>
            Department / Execution Wing
            <input required value={form.department} onChange={set('department')} />
          </label>
          <label>
            Awarded Contractor / Agency
            <input required value={form.contractor} onChange={set('contractor')} placeholder="ABC Infrastructure Pvt Ltd" />
          </label>
          <label>
            Location / Ward / Stretch
            <input value={form.location} onChange={set('location')} placeholder="Ward 12, Main Road" />
          </label>
          <label>
            Target Completion Date
            <input type="date" value={form.deadline} onChange={set('deadline')} />
          </label>
          <label>
            Warranty / Defect Liability Period (DLP)
            <input value={form.warranty} onChange={set('warranty')} placeholder="36 months defect liability" />
          </label>
          <div className="full">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Engineering Scope & Technical Notes (used for AI legitimacy analysis & breakdown)
              </label>
              <VoiceInputButton
                onTranscript={(text) => {
                  setForm((f) => ({
                    ...f,
                    specs: f.specs ? `${f.specs} ${text}` : text,
                  }));
                }}
                title="Dictate engineering specifications"
              />
            </div>
            <textarea
              rows={3}
              value={form.specs}
              onChange={set('specs')}
              placeholder="e.g. 50 mm VG-30 Bituminous Concrete wearing course over 150 mm WMM base; RCC box drain M25 grade (or click 'Voice Dictate' to speak)"
            />
          </div>
          <button
            className="full w-full bg-gradient-to-b from-blue-900 to-blue-600 hover:from-blue-950 hover:to-blue-700 text-white font-bold py-3.5 px-6 rounded-full shadow-md transition-all cursor-pointer text-sm disabled:opacity-50"
            disabled={busy}
          >
            {busy ? 'Publishing & generating AI breakdown' : 'Publish Tender to Public Registry'}
          </button>
        </form>
      )}

      {/* Tender Cards Directory */}
      <section className="grid cards">
        {tenders.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 text-sm">
            <span className="text-3xl block mb-2">📑</span>
            No public tenders found matching your query
          </div>
        )}
        {tenders.map((t) => (
          <article className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between" key={t.tenderId}>
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                  {t.tenderId}
                </span>
                <span className={`status status-${t.status} text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border`}>
                  {statusLabel(t.status)}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2 my-1.5">{t.title}</h3>
              <p className="text-xs text-slate-500 mb-2 truncate">
                {t.department} · 📍 {t.location || 'Municipal Area'}
              </p>

              <dl className="grid grid-cols-2 gap-2 my-3 py-2 border-y border-slate-100 text-xs">
                <div>
                  <dt className="text-slate-500 font-semibold uppercase text-[10px]">Sanctioned Budget</dt>
                  <dd className="text-sm font-extrabold text-slate-900 mt-0.5">{formatINR(t.budget)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 font-semibold uppercase text-[10px]">Contractor</dt>
                  <dd className="font-semibold text-slate-800 truncate mt-0.5" title={t.contractor}>{t.contractor}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 font-semibold uppercase text-[10px]">Due Date</dt>
                  <dd className="font-semibold text-slate-800 mt-0.5">{formatDate(t.deadline)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 font-semibold uppercase text-[10px]">Warranty</dt>
                  <dd className="font-semibold text-slate-800 truncate mt-0.5" title={t.warranty}>{t.warranty || '—'}</dd>
                </div>
              </dl>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                className="bg-gradient-to-b from-blue-900 to-blue-600 hover:from-blue-950 hover:to-blue-700 text-white font-semibold text-xs py-2.5 px-3 rounded-full transition-all cursor-pointer flex-1 shadow-xs text-center inline-flex items-center justify-center gap-1"
                onClick={() => setOpen(t.tenderId)}
              >
                <span>🔍</span> View in Details
              </button>
              <button
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs py-2.5 px-3 rounded-full transition-colors cursor-pointer flex-1 text-center inline-flex items-center justify-center gap-1"
                onClick={() => {
                  if (!user) {
                    toast('Please sign in to file defect observations');
                    openAuthModal();
                  } else {
                    setDisputeFor(t);
                  }
                }}
                title="Report defect or substandard work"
              >
                <span>⚠️ Defect</span>
                {t.disputeCount ? <span className="font-bold">({t.disputeCount})</span> : null}
              </button>
            </div>
          </article>
        ))}
      </section>

      {open && (
        <TenderModal
          tenderId={open}
          onClose={() => setOpen(null)}
          onDispute={(t) => {
            setOpen(null);
            setDisputeFor(t);
          }}
        />
      )}

      {disputeFor && (
        <DisputeForm tender={disputeFor} onClose={() => setDisputeFor(null)} onDone={load} />
      )}
    </>
  );
}
