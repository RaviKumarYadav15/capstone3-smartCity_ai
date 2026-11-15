import { useState } from 'react';
import Modal from './Modal.jsx';
import {
  BsShieldCheck,
  BsExclamationTriangleFill,
  BsCamera,
  BsPersonCheck,
  BsBuilding,
  BsCheckCircleFill,
  BsXCircleFill,
  BsArrowRight,
  BsClockHistory,
} from 'react-icons/bs';

export default function GuidelinesModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('warning'); // 'warning' | 'lifecycle' | 'roles' | 'strikes' | 'photos'

  if (!isOpen) return null;

  return (
    <Modal title="SmartCity Operating Guidelines & Civic Charter" onClose={onClose} wide>
      <div className="flex flex-col gap-6">
        {/* Navigation Pills inside Modal */}
        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3 -mt-1">
          <button
            type="button"
            onClick={() => setActiveTab('warning')}
            className={`text-xs font-bold py-1.5 px-3.5 rounded-full border transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'warning'
                ? 'bg-red-600 text-white border-red-600 shadow-xs'
                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
            }`}
          >
            <BsExclamationTriangleFill size={12} />
            <span>Anti-Fraud Warning</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lifecycle')}
            className={`text-xs font-bold py-1.5 px-3.5 rounded-full border transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'lifecycle'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>5-Step Lifecycle</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`text-xs font-bold py-1.5 px-3.5 rounded-full border transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'roles'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>Who Does What</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('strikes')}
            className={`text-xs font-bold py-1.5 px-3.5 rounded-full border transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'strikes'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>Strike & Ban Rules</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('photos')}
            className={`text-xs font-bold py-1.5 px-3.5 rounded-full border transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'photos'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>Photo Do's & Don'ts</span>
          </button>
        </div>

        {/* Tab 1: Anti-Fraud Warning */}
        {activeTab === 'warning' && (
          <div className="space-y-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-red-50 to-amber-50 border-2 border-red-200 shadow-xs">
              <div className="flex items-center gap-3 mb-2.5">
                <span className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center text-xl shrink-0 shadow-xs">
                  ⚠️
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-red-950 m-0">
                    Official Warning: Zero Tolerance for False or Prank Reports
                  </h3>
                  <p className="text-xs font-semibold text-red-700 m-0">
                    SmartCity.ai dispatches real emergency response teams and municipal engineers
                  </p>
                </div>
              </div>
              <p className="text-xs text-red-900 leading-relaxed m-0 mb-3">
                Every report filed on this platform is tracked by municipal department engineers, public works contractors, and civic responders. Submitting prank complaints, internet memes, fake photos, or private property disputes wastes critical public resources and directly delays repairs for real community hazards.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-red-200">
                  <strong className="block text-red-900 font-bold mb-0.5">1. AI Vision Audit</strong>
                  <span className="text-slate-600 text-[11px] leading-tight block">
                    Gemini AI scans every upload. Non-civic or staged pictures are rejected automatically.
                  </span>
                </div>
                <div className="bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-red-200">
                  <strong className="block text-red-900 font-bold mb-0.5">2. Ground Eyewitnesses</strong>
                  <span className="text-slate-600 text-[11px] leading-tight block">
                    Municipal teams and nearby neighbors physically verify the exact GPS coordinates.
                  </span>
                </div>
                <div className="bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-red-200">
                  <strong className="block text-red-900 font-bold mb-0.5">3. Enforced Sanctions</strong>
                  <span className="text-slate-600 text-[11px] leading-tight block">
                    False reports immediately trigger strikes, temporary cooldowns, and permanent bans.
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700">
              <h4 className="font-bold text-slate-900 mb-1 text-sm">Legal & Civic Responsibility Notice:</h4>
              <p className="m-0 leading-relaxed text-slate-600">
                Residents who repeatedly log fraudulent incidents risk permanent loss of their civic reporting identity, and intentional disruption of municipal public safety services may be referred to local civil authorities under public nuisance bylaws.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: 5-Step Lifecycle */}
        {activeTab === 'lifecycle' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 m-0">The 5-Step Civic Resolution Lifecycle</h3>
            <p className="text-xs text-slate-500 m-0 -mt-2">
              From the moment you snap a photo to full on-ground repair verification:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Step 1
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 mt-2 mb-1">Photo Evidence</h4>
                  <p className="text-[11px] text-slate-500 leading-snug m-0">
                    Citizen captures a clear photo of the hazard with live device GPS pin.
                  </p>
                </div>
                <span className="text-xl mt-3">📸</span>
              </div>

              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Step 2
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 mt-2 mb-1">AI Inspection</h4>
                  <p className="text-[11px] text-slate-500 leading-snug m-0">
                    Gemini AI confirms authenticity, assigns priority, and routes to the right department.
                  </p>
                </div>
                <span className="text-xl mt-3">⚡</span>
              </div>

              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Step 3
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 mt-2 mb-1">Live Map Pin</h4>
                  <p className="text-[11px] text-slate-500 leading-snug m-0">
                    Incident appears in real time on the interactive City Issues Map.
                  </p>
                </div>
                <span className="text-xl mt-3">🗺️</span>
              </div>

              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Step 4
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 mt-2 mb-1">Peer Consensus</h4>
                  <p className="text-[11px] text-slate-500 leading-snug m-0">
                    Neighbors upvote and 3 on-ground eyewitnesses (within 250m) escalate it to Verified.
                  </p>
                </div>
                <span className="text-xl mt-3">👥</span>
              </div>

              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Step 5
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 mt-2 mb-1">Field Repair</h4>
                  <p className="text-[11px] text-slate-500 leading-snug m-0">
                    Authorities complete the fix, log verification notes, and mark it Resolved.
                  </p>
                </div>
                <span className="text-xl mt-3">✅</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Roles & Responsibilities */}
        {activeTab === 'roles' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 m-0">Who Does What in SmartCity</h3>
            <p className="text-xs text-slate-500 m-0 -mt-2">
              Three synchronized stakeholder groups keep municipal infrastructure functioning:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl mb-3">
                    <BsPersonCheck />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">Citizens & Residents</h4>
                  <ul className="text-xs text-slate-600 space-y-1.5 pl-4 list-disc leading-relaxed">
                    <li>Submit photographic evidence with GPS location tags.</li>
                    <li>Upvote community issue priority in your locality.</li>
                    <li>Verify on-ground reports when physically within 250m.</li>
                    <li>Audit public works contracts on the Public Tenders page.</li>
                  </ul>
                </div>
                <span className="text-[10px] text-blue-700 font-semibold mt-3 pt-2 border-t border-slate-100">
                  Accountability: Real residents driving local change
                </span>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-xl mb-3">
                    <BsShieldCheck />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">Municipal Authorities</h4>
                  <ul className="text-xs text-slate-600 space-y-1.5 pl-4 list-disc leading-relaxed">
                    <li>Review verified civic reports and assign field contractors.</li>
                    <li>Coordinate inter-departmental action (PWD, Water, Energy).</li>
                    <li>Inspect physical repair work and log resolution notes.</li>
                    <li>Moderate spurious or invalid complaints and apply strikes.</li>
                  </ul>
                </div>
                <span className="text-[10px] text-purple-700 font-semibold mt-3 pt-2 border-t border-slate-100">
                  Accountability: Government engineers & administrators
                </span>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-xl mb-3">
                    <BsBuilding />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">Public Works Contractors</h4>
                  <ul className="text-xs text-slate-600 space-y-1.5 pl-4 list-disc leading-relaxed">
                    <li>Deliver civil infrastructure projects under tender guidelines.</li>
                    <li>Honor mandatory Defect Liability Period (DLP) warranties.</li>
                    <li>Perform zero-cost remedial repairs when defects are flagged.</li>
                    <li>Adhere to published transparent material and rate benchmarks.</li>
                  </ul>
                </div>
                <span className="text-[10px] text-amber-700 font-semibold mt-3 pt-2 border-t border-slate-100">
                  Accountability: Civil engineering contractors & builders
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Strike & Ban Rules */}
        {activeTab === 'strikes' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 m-0">The 3-Tier Community Strike & Sanction Ladder</h3>
            <p className="text-xs text-slate-500 m-0 -mt-2">
              How the platform protects municipal teams against spam and protects honest citizens against unfair bans:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-4 rounded-2xl border border-yellow-200 bg-yellow-50/60 text-xs">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-900 border border-yellow-300">
                  Strike 1
                </span>
                <h4 className="text-sm font-bold text-slate-900 mt-2 mb-1">Warning Notice</h4>
                <p className="text-slate-600 leading-relaxed mb-2">
                  The rejected report is removed from the public map. An official warning notice appears in the citizen's profile explaining why the report was invalid.
                </p>
                <div className="font-semibold text-emerald-800">
                  ✓ Full reporting and voting privileges remain active.
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50 text-xs">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-400">
                  Strike 2
                </span>
                <h4 className="text-sm font-bold text-slate-900 mt-2 mb-1">7-Day Cooldown Pause</h4>
                <p className="text-slate-700 leading-relaxed mb-2">
                  Upon accumulating 2 verified false reports, the citizen's account enters an automatic 7-day cooldown suspension.
                </p>
                <div className="font-semibold text-amber-900">
                  ⚠️ Reporting and voting locked for 7 days. Auto-restores afterwards.
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-red-300 bg-red-50 text-xs">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-900 border border-red-400">
                  Strike 3
                </span>
                <h4 className="text-sm font-bold text-slate-900 mt-2 mb-1">Permanent Restriction</h4>
                <p className="text-slate-700 leading-relaxed mb-2">
                  Accounts reaching 3 strikes are permanently restricted from submitting reports and voting. Can only be unbanned through official administrative appeal.
                </p>
                <div className="font-semibold text-red-900">
                  🚫 Indefinite restriction across the platform.
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
              <span className="text-sm">ℹ️</span>
              <div className="leading-relaxed">
                <strong>Fairness Protection:</strong> Submitting a duplicate of an existing open issue does <strong>NOT</strong> incur any strike. If an authority rejects a report by mistake and later reverses it, the strike is automatically wiped from your record.
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Photo Do's & Don'ts */}
        {activeTab === 'photos' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 m-0">Photo Evidence Guidelines</h3>
            <p className="text-xs text-slate-500 m-0 -mt-2">
              Follow these simple photographic rules so Gemini AI can verify and dispatch your report instantly:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 text-xs">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-2">
                  <BsCheckCircleFill className="text-emerald-600" />
                  <span>What to Photograph (Do)</span>
                </div>
                <ul className="space-y-2 text-slate-700 list-disc pl-4 leading-relaxed">
                  <li><strong>Clear perspective</strong>: Take photo 2 to 4 meters back so context and street surroundings are visible.</li>
                  <li><strong>Physical damage</strong>: Potholes, broken water pipes, uncollected garbage piles, downed electric lines.</li>
                  <li><strong>Adequate lighting</strong>: If capturing at night, turn on camera flash or capture under streetlights.</li>
                  <li><strong>Live capture</strong>: Use the integrated camera tool whenever possible for genuine timestamping.</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl border border-red-200 bg-red-50/50 text-xs">
                <div className="flex items-center gap-2 text-red-800 font-bold text-sm mb-2">
                  <BsXCircleFill className="text-red-600" />
                  <span>What NOT to Photograph (Don't)</span>
                </div>
                <ul className="space-y-2 text-slate-700 list-disc pl-4 leading-relaxed">
                  <li><strong>Private property</strong>: Damage inside private apartments, backyards, or residential gates.</li>
                  <li><strong>People & Selfies</strong>: Avoid focusing on faces, bystanders, or vehicle license plates.</li>
                  <li><strong>Pets & Animals</strong>: Domestic pets, stray animals (unless a rabies/sanitation hazard).</li>
                  <li><strong>Screenshots & Memes</strong>: Internet downloads or computer screens will be rejected by AI.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Footer Close Button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs text-slate-500">
            SmartCity Civic Operating Framework · Enforced by Municipal Bylaws
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-6 rounded-full transition shadow-xs cursor-pointer"
          >
            I Understand the Guidelines
          </button>
        </div>
      </div>
    </Modal>
  );
}
