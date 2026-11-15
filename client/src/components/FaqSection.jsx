import { useState } from 'react';
import { BsChevronDown, BsQuestionCircleFill } from 'react-icons/bs';

const FAQS = [
  {
    q: 'What happens if someone submits a fake or prank report?',
    a: 'SmartCity enforces a strict zero-tolerance anti-fraud policy. First, Google Gemini AI vision inspects every uploaded photo and automatically rejects domestic pets, memes, selfies, and non-civic photos. Second, municipal ground inspectors physically verify the reported GPS coordinates. If an issue is flagged as a prank or false complaint, the user receives an official strike. Under our 3-Tier Policy: Strike 1 is a warning, Strike 2 triggers an immediate 7-day account cooldown suspension (reporting and voting privileges revoked), and Strike 3 results in a permanent ban.',
  },
  {
    q: 'How does the AI photo inspection and auto-categorization work?',
    a: 'When you upload or snap a photo of a hazard, Gemini AI analyzes visual damage markers (such as asphalt depth, fractured water pipes, uncollected refuse, or dark streetlights). It automatically identifies the responsible municipal department (PWD, Water Board, Electricity, or Sanitation), estimates the severity level, and sets an initial priority score so city dispatchers can route emergency repair crews without manual data entry delays.',
  },
  {
    q: 'What is the Defect Liability Period (DLP) on public tenders?',
    a: 'Under civil engineering contracts, newly completed roads and public infrastructure carry a mandatory Defect Liability Period (typically 1 to 5 years). During this warranty window, the civil contractor who built the project is legally obligated to repair premature potholes, cracks, or substandard asphalt breakdown at zero additional expense to taxpayers. Citizens can search tenders in plain words on our Tenders page and submit defect dispute claims backed by photographic evidence.',
  },
  {
    q: 'How does on-ground community peer verification work?',
    a: 'To prevent remote spam and false alarms, peer verification requires physical proximity. Residents within a 250-meter GPS radius of the reported hazard can tap "Verify" on their mobile device to confirm that the issue exists on the ground. Once 3 independent local neighbors verify the issue, it automatically escalates from "Reported" to "Community Verified" for prioritized municipal dispatch.',
  },
  {
    q: 'Is my personal identity anonymous on public feeds?',
    a: 'Yes. Your personal email address and private credentials are never shared or published. Public incident feeds and the live map only show your chosen resident display name and the physical location of the civic hazard. Only authorized municipal administrative officers can view official account logs for moderation and verification.',
  },
  {
    q: 'How do I appeal an invalid report strike or account suspension?',
    a: 'If you believe your report was rejected in error (for example, road waterlogging that drained before municipal inspection), you can click "Appeal to Administration" on your Report page or contact administration directly at support@smartcity.gov. Municipal supervisors review the ground timestamps and can restore your good standing and wipe strikes with one click.',
  },
];

export default function FaqSection({ onOpenGuidelines }) {
  const [openIndex, setOpenIndex] = useState(0); // open first FAQ by default

  const toggle = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="w-full max-w-6xl mx-auto pt-6 border-t border-slate-200/80">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-3">
          <BsQuestionCircleFill size={13} />
          <span>Frequently Asked Questions</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Everything You Need to Know
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm max-w-xl mx-auto mt-2 leading-relaxed">
          Clear answers about automated AI verification, citizen peer reviews, tender warranties, and platform integrity rules.
        </p>
      </div>

      <div className="space-y-3 max-w-4xl mx-auto">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isOpen
                  ? 'bg-white border-blue-300 shadow-sm'
                  : 'bg-white/80 border-slate-200/90 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                aria-expanded={isOpen}
              >
                <span className={`text-sm sm:text-base font-bold transition-colors ${
                  isOpen ? 'text-blue-700' : 'text-slate-800'
                }`}>
                  {faq.q}
                </span>
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                    isOpen ? 'bg-blue-100 text-blue-700 rotate-180' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <BsChevronDown size={12} />
                </span>
              </button>

              {isOpen && (
                <div className="px-4 pb-5 sm:px-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 animate-in fade-in duration-150">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {onOpenGuidelines && (
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500 mb-2">Still looking for detailed operating procedures?</p>
          <button
            type="button"
            onClick={onOpenGuidelines}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
          >
            Read the Full Platform Guidelines & Civic Charter →
          </button>
        </div>
      )}
    </section>
  );
}
