import { useState } from 'react';
import Modal from './Modal.jsx';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useToast } from './Toast.jsx';
import { EMOJI, statusLabel } from '../utils/format.js';
import { BsCheckCircleFill, BsFileEarmarkText, BsClipboardCheck, BsShieldCheck } from 'react-icons/bs';

function formatBoldText(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function parseSteps(steps) {
  if (!steps) return [];
  if (Array.isArray(steps)) return steps;
  if (typeof steps !== 'string') return [];
  if (steps.includes('\n')) {
    return steps
      .split(/\r?\n+/)
      .map((s) => s.replace(/^[\s•\-\d.]+\s*/, '').trim())
      .filter(Boolean);
  }
  const parts = steps.split(/(?=\s*\b\d+\.\s+)/);
  if (parts.length > 1) {
    return parts
      .map((s) => s.replace(/^[\s•\-\d.]+\s*/, '').trim())
      .filter(Boolean);
  }
  return [steps.trim()];
}

export default function ReportAnalysisModal({ report, onClose, onUpdate, isNewSubmission = false }) {
  const { user } = useAuth();
  const toast = useToast();
  const [letter, setLetter] = useState(report.complaintLetter || '');
  const [drafting, setDrafting] = useState(false);
  const [copied, setCopied] = useState(false);

  const isAuthor = Boolean(report.mine);
  const stepsList = parseSteps(report.steps);

  const handleDraftLetter = async () => {
    if (!isAuthor) {
      toast.error('Only the original author can draft the complaint letter');
      return;
    }
    setDrafting(true);
    try {
      const res = await api.post(`/reports/${report.id}/letter`);
      setLetter(res.letter);
      if (onUpdate) {
        onUpdate({ ...report, complaintLetter: res.letter, hasLetter: true });
      }
      toast.success('Official complaint letter drafted & attached');
    } catch (err) {
      toast.error(err.message || 'Failed to generate letter');
    } finally {
      setDrafting(false);
    }
  };

  const handleCopy = () => {
    if (!letter) return;
    navigator.clipboard.writeText(letter);
    setCopied(true);
    toast.success('Letter copied to clipboard');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal title="Civic Incident Details & Action Plan" onClose={onClose} wide>
      <div className="flex flex-col gap-5 py-1">
        {/* Banner */}
        {isNewSubmission ? (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200">
            <BsCheckCircleFill className="text-emerald-600 text-2xl shrink-0" />
            <div className="flex-1">
              <h3 className="text-emerald-900 font-bold text-sm sm:text-base m-0">
                Report Submitted & AI-Verified
              </h3>
              <p className="text-emerald-700 text-xs mt-0.5 m-0">
                Your report has been recorded on the live city infrastructure grid and assigned to the responsible department.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-50/80 border border-blue-200">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div>
                <h3 className="text-blue-950 font-bold text-sm sm:text-base m-0">
                  Civic Incident Details & Remediation Plan
                </h3>
                <p className="text-blue-700 text-xs mt-0.5 m-0">
                  Engineering remediation roadmap and diagnostic assessment for issue filed by <strong className="text-blue-900">{report.userName || 'Resident'}</strong>.
                </p>
              </div>
            </div>
            <span className={`status status-${report.status} text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shrink-0 bg-white`}>
              {statusLabel(report.status)}
            </span>
          </div>
        )}

        {/* Incident Description & Meta */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span><strong>Reported by:</strong> {report.userName || 'Resident'}</span>
            <span>📍 {Number(report.lat).toFixed(4)}, {Number(report.lng).toFixed(4)}</span>
          </div>
          <p className="text-slate-800 text-xs sm:text-sm font-medium leading-relaxed m-0">
            {report.description}
          </p>
        </div>

        {/* Issue Overview & Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Priority</span>
            <strong className="text-lg font-extrabold text-slate-900">{report.priority} / 10</strong>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Severity</span>
            <span className={`inline-block mt-0.5 tag sev-${report.severity} uppercase text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full`}>
              {report.severity}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Risk Level</span>
            <strong className="text-sm font-bold text-slate-800 capitalize mt-0.5 block">{report.risk || 'Medium'}</strong>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Target Repair</span>
            <strong className="text-sm font-bold text-slate-800 mt-0.5 block">{report.fixTime || '2–4 days'}</strong>
          </div>
        </div>

        {/* Responsible Department */}
        <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Assigned Agency:</span>
          <strong className="text-blue-900 font-bold">{report.department}</strong>
        </div>

        {/* Remediation Action Steps in List Format */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 m-0 flex items-center gap-2">
              <span>🛠️</span>
              Remediation Steps & Recommended Actions
            </h4>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              Public Accountability
            </span>
          </div>

          {stepsList.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {stepsList.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs"
                >
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-xs sm:text-sm text-slate-700 m-0 leading-relaxed">
                    {formatBoldText(step)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              Standard municipal field inspection and defect rectification protocols have been logged for this incident.
            </div>
          )}
        </div>

        {/* Formal Complaint Letter Section - Only for the original author user */}
        {isAuthor && (
          <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 m-0 flex items-center gap-2">
                <BsFileEarmarkText className="text-blue-600" />
                Official Department Grievance Letter
              </h4>
              {letter && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  ✓ Attached to Report
                </span>
              )}
            </div>

            {!letter ? (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <span className="font-bold text-slate-800 text-xs sm:text-sm block">
                    Generate Formal RTI-Style Redressal Letter
                  </span>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">
                    Draft an official formal letter with GPS coordinates and priority rating addressed to {report.department}.
                  </p>
                </div>
                <button
                  className="bg-black hover:bg-slate-800 text-white font-semibold text-xs py-2.5 px-5 rounded-full transition-all cursor-pointer shadow-xs shrink-0 disabled:opacity-50"
                  onClick={handleDraftLetter}
                  disabled={drafting}
                >
                  {drafting ? 'Drafting with AI...' : '✉️ Draft Formal Letter'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <pre className="letter max-h-56 overflow-y-auto">{letter}</pre>
                <div className="flex items-center gap-2">
                  <button
                    className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2 px-4 rounded-full transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                    onClick={handleCopy}
                  >
                    <BsClipboardCheck size={13} />
                    <span>{copied ? 'Copied!' : 'Copy Letter'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Close Button */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2.5 px-6 rounded-full transition-colors cursor-pointer"
            onClick={onClose}
          >
            {isNewSubmission ? 'Close & View Report Form' : 'Close'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
