import { useEffect, useState } from 'react';
import { api, resolveImageUrl } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useToast } from './Toast.jsx';
import Modal from './Modal.jsx';
import { formatINR, formatDate, statusLabel } from '../utils/format.js';

export default function TenderModal({ tenderId, onClose, onDispute }) {
  const { user, openAuthModal } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.get(`/tenders/${encodeURIComponent(tenderId)}`).then(setData).catch((e) => toast(e.message));

  useEffect(() => {
    load();
  }, [tenderId]);

  const support = async (id) => {
    if (!user) {
      toast('Please sign in to support this report');
      openAuthModal();
      return;
    }
    try {
      await api.post(`/disputes/${id}/support`);
      load();
      toast('Support recorded');
    } catch (e) {
      toast(e.message);
    }
  };

  const verifyWithAi = async () => {
    if (!user) {
      toast('Please sign in to run AI analysis');
      openAuthModal();
      return;
    }
    setBusy(true);
    try {
      await api.post(`/tenders/${encodeURIComponent(tenderId)}/breakdown`);
      await load();
      toast('Tender expenses audited & verified');
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <Modal title="Tender Details" onClose={onClose}>
        <div className="py-12 text-center text-slate-500">Loading tender data</div>
      </Modal>
    );
  }

  const { tender: t, disputes } = data;
  const b = t.aiBreakdown;
  const feas = b?.feasibility;

  const verdictBadge = (verdict) => {
    if (verdict === 'within_benchmark') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Within Standard Benchmark Norms
        </span>
      );
    }
    if (verdict === 'flagged_variance') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span> High Cost Variance Detected
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 inline-flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-slate-400"></span> Human Verification / Field Audit Needed
      </span>
    );
  };

  return (
    <Modal title={t.title} onClose={onClose} wide>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pb-3 border-b border-slate-100">
        <span>Tender ID: <strong className="text-slate-800">{t.tenderId}</strong></span>
        <span>Department: <strong className="text-slate-800">{t.department}</strong></span>
        <span>Location: <strong className="text-slate-800">{t.location || 'Municipal Area'}</strong></span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Sanctioned Budget</div>
          <strong className="text-base text-slate-900 block mt-0.5">{formatINR(t.budget)}</strong>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Contractor</div>
          <strong className="text-sm text-slate-900 block mt-0.5 truncate" title={t.contractor}>{t.contractor}</strong>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Target Completion</div>
          <strong className="text-sm text-slate-900 block mt-0.5">{formatDate(t.deadline)}</strong>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Warranty / DLP</div>
          <strong className="text-sm text-slate-900 block mt-0.5">{t.warranty || 'Standard Agreement'}</strong>
        </div>
      </div>

      {/* AI Expense Legitimacy & Feasibility Section */}
      <div className="my-6 p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 m-0">Tender Expense Legitimacy & Breakdown</h3>
          </div>
          {feas ? verdictBadge(feas.verdict) : (
            <button
              className="bg-gradient-to-b from-blue-900 to-blue-600 hover:from-blue-950 hover:to-blue-700 text-white font-semibold text-xs py-2 px-4 rounded-full transition-all cursor-pointer shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
              onClick={verifyWithAi}
              disabled={busy}
            >
              {busy ? 'Auditing with AI' : '⚡ Audit & Verify with AI'}
            </button>
          )}
        </div>

        {b ? (
          <>
            {feas && (
              <div className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm">
                <p className="text-slate-800 font-medium m-0 mb-3 leading-relaxed">{feas.summary}</p>

                {feas.keyObservations?.length > 0 && (
                  <div className="mb-3">
                    <strong className="text-xs uppercase font-bold text-slate-600 block mb-1">Key Rate Observations:</strong>
                    <ul className="list-disc pl-5 text-xs text-slate-600 flex flex-col gap-1">
                      {feas.keyObservations.map((o, idx) => (
                        <li key={idx}>{o}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {feas.citizenQuestions?.length > 0 && (
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <strong className="text-xs uppercase font-bold text-emerald-800 block mb-1">
                      💡 Questions to Ask in RTI or at Municipal Meetings:
                    </strong>
                    <ul className="list-decimal pl-5 text-xs text-slate-700 flex flex-col gap-1">
                      {feas.citizenQuestions.map((q, idx) => (
                        <li key={idx} className="font-medium">{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="notice my-3 text-xs">
              ⚠️ <strong>Civic Disclaimer:</strong> AI cost allocations are benchmark estimates to help citizens understand the contract — official payments are governed by certified measurement books and the department's Bill of Quantities (BOQ)
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Est. Amount</th>
                    <th>Share</th>
                    <th>Technical Spec</th>
                    <th>In Plain Language</th>
                  </tr>
                </thead>
                <tbody>
                  {b.table.map((row) => (
                    <tr key={row.component}>
                      <td className="font-semibold text-slate-800">{row.component}</td>
                      <td>{formatINR(row.amount)}</td>
                      <td className="font-mono text-xs">{row.share}</td>
                      <td className="text-xs text-slate-600">{row.specs}</td>
                      <td className="text-xs text-slate-700">{row.summary}</td>
                    </tr>
                  ))}
                  <tr className="total">
                    <td>Total Sanctioned</td>
                    <td>{formatINR(t.budget)}</td>
                    <td>100%</td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {b.warrantyNotes && (
              <p className="text-xs text-slate-600 mt-2">
                <strong>Warranty & Defect Liability Notes:</strong> {b.warrantyNotes}
              </p>
            )}

            {b.checklist?.length > 0 && (
              <div className="mt-3">
                <strong className="text-xs text-slate-700 block mb-1">Citizen Inspection Checklist:</strong>
                <ul className="list-disc pl-5 text-xs text-slate-600 flex flex-col gap-1">
                  {b.checklist.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6 text-slate-500 text-sm">
            <p className="mb-2">No AI cost audit generated yet for this tender</p>
            <button
              className="bg-gradient-to-b from-blue-900 to-blue-600 hover:from-blue-950 hover:to-blue-700 text-white font-semibold text-xs py-2.5 px-5 rounded-full transition-all cursor-pointer shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
              onClick={verifyWithAi}
              disabled={busy}
            >
              {busy ? 'Analyzing' : '⚡ Generate AI Audit & Verification'}
            </button>
          </div>
        )}
      </div>

      {/* Citizen Observations & Quality Reports */}
      <div className="border-t border-slate-200 pt-5 mt-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900 m-0">
              Citizen Quality Reports ({disputes.length})
            </h3>
          </div>
          <button
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 py-2 rounded-full transition-colors cursor-pointer"
            onClick={() => onDispute(t)}
          >
            ⚠️ File Quality Issue
          </button>
        </div>

        {disputes.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">No citizen complaints or defect reports recorded on this tender</p>
        ) : (
          <div className="flex flex-col gap-3 mt-3">
            {disputes.map((d) => (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-sm flex flex-col gap-2" key={d.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-800 text-xs px-2.5 py-0.5 rounded-full bg-white border border-slate-200">
                    {d.category}
                  </span>
                  <span className="text-xs text-slate-500">
                    {d.userName} · <span className="capitalize font-semibold">{statusLabel(d.status)}</span>
                  </span>
                </div>
                <p className="text-slate-700 m-0 leading-relaxed text-xs">{d.description}</p>
                {d.imageUrl && (
                  <img className="max-h-36 object-cover rounded-lg border border-slate-200 mt-1" src={resolveImageUrl(d.imageUrl)} alt="Defect evidence" loading="lazy" />
                )}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 mt-1">
                  <button
                    className={`text-xs px-3.5 py-1.5 rounded-full border font-semibold transition-all cursor-pointer ${
                      d.iSupported ? 'bg-sky-50 text-sky-700 border-sky-300 font-bold' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                    disabled={d.iSupported}
                    onClick={() => support(d.id)}
                  >
                    {d.iSupported ? '✓ You confirmed this issue' : '✋ I saw this too'} ({d.supportCount})
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
