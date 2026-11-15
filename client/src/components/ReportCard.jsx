import { useState, useEffect } from 'react';
import { api, resolveImageUrl } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useToast } from './Toast.jsx';
import ReportAnalysisModal from './ReportAnalysisModal.jsx';
import { EMOJI, formatDate, statusLabel } from '../utils/format.js';
import { reverseGeocode } from '../utils/geocode.js';

export default function ReportCard({ report: r, onChange, onLocate }) {
  const { user, openAuthModal } = useAuth();
  const toast = useToast();
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [address, setAddress] = useState(
    r.address?.formatted ||
    [r.address?.area, r.address?.city, r.address?.state].filter(Boolean).join(', ') ||
    r.address?.city ||
    r.city ||
    ''
  );

  useEffect(() => {
    if (!address && typeof r.lat === 'number' && typeof r.lng === 'number') {
      let active = true;
      reverseGeocode(r.lat, r.lng)
        .then((geo) => {
          if (active && geo?.formatted) {
            setAddress(geo.formatted);
          }
        })
        .catch(() => {});
      return () => { active = false; };
    }
  }, [r.lat, r.lng, address]);

  const act = async (path, body) => {
    if (!user) {
      openAuthModal();
      return;
    }
    try {
      const res = await api.post(`/reports/${r.id}/${path}`, body);
      onChange(res.report);
      if (path === 'vote') {
        if (!res.report.myVote) {
          toast.success('Reaction removed');
        } else if (res.report.myVote === 'up') {
          toast.success('Upvoted issue priority');
        } else {
          toast.success('Downvoted issue priority');
        }
      }
    } catch (e) {
      toast(e.message);
    }
  };

  const handleVerify = () => {
    if (!user) {
      openAuthModal();
      return;
    }
    if (['admin', 'authority'].includes(user?.role)) {
      act('verify', {});
      return;
    }
    if (!navigator.geolocation) {
      toast('GPS location required to verify issues (within 250m)');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        act('verify', { lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        toast('Please enable GPS location to verify issues on-ground');
      },
      { timeout: 8000 }
    );
  };

  return (
    <article className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
      <div className="relative">
        {r.imageUrl ? (
          <img
            className="report-img w-full h-44 object-cover bg-slate-100"
            src={resolveImageUrl(r.imageUrl)}
            alt={`${r.category} reported by ${r.userName}`}
            loading="lazy"
          />
        ) : (
          <div className="report-img placeholder w-full h-44 grid place-items-center text-4xl bg-slate-50 border-b border-slate-100" aria-hidden>
            {EMOJI[r.category] || '⚠️'}
          </div>
        )}
        {r.iVerified && (
          <span className="absolute top-3 right-3 bg-blue-600/95 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md backdrop-blur-xs flex items-center gap-1.5 border border-white/20">
            ✓ Verified by You
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col gap-2.5 flex-1 justify-between">
        <div>
          <div className="tags flex flex-wrap gap-1.5 items-center mb-2">
            <span className={`tag sev-${r.severity} uppercase text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full`}>
              {r.severity}
            </span>
            <span className="tag text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
              {r.category}
            </span>
            {r.verifications >= 3 && (
              <span className="tag ok text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ✓ Community Verified
              </span>
            )}
          </div>

          <p className="text-slate-800 text-sm font-medium leading-snug line-clamp-3 mb-2">{r.description}</p>
        </div>

        <div>
          {/* Actual Fetched Street Address */}
          {address ? (
            <div className="text-xs text-slate-700 font-medium flex items-start gap-1.5 pt-2 border-t border-slate-100 mb-1.5 bg-slate-50/70 p-2 rounded-xl border border-slate-100/80">
              <span className="text-blue-600 mt-0.5 shrink-0 text-sm">📍</span>
              <span className="line-clamp-2 leading-relaxed" title={address}>
                {address}
              </span>
            </div>
          ) : null}

          <div className={`meta flex justify-between items-center text-xs text-slate-500 mb-1 ${!address ? 'pt-2 border-t border-slate-100' : ''}`}>
            {onLocate ? (
              <button
                type="button"
                onClick={() => onLocate(r)}
                className="text-xs text-blue-600 hover:text-blue-800 font-mono font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Click to locate on the map above"
              >
                <span>🎯</span>
                <span>GPS: {Number(r.lat).toFixed(4)}, {Number(r.lng).toFixed(4)}</span>
              </button>
            ) : (
              <span className="font-mono">🎯 GPS: {Number(r.lat).toFixed(4)}, {Number(r.lng).toFixed(4)}</span>
            )}
            <span>{formatDate(r.createdAt)}</span>
          </div>
          <div className="meta flex justify-between items-center text-xs text-slate-500 mb-3">
            <span className="font-semibold text-slate-700">{r.userName}</span>
            <span className="truncate max-w-[140px] text-right" title={r.department}>{r.department}</span>
          </div>

          <div className="actions flex items-center gap-1.5 pt-2.5 border-t border-slate-100">
            <button
              className={`text-xs font-semibold py-1 px-3 rounded-full border transition-all cursor-pointer ${
                r.myVote === 'up'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              onClick={() => act('vote', { type: 'up' })}
              title={r.myVote === 'up' ? 'Click again to remove your upvote' : 'Upvote priority'}
            >
              👍 {r.upvotes}
            </button>
            <button
              className={`text-xs font-semibold py-1 px-3 rounded-full border transition-all cursor-pointer ${
                r.myVote === 'down'
                  ? 'bg-red-50 text-red-700 border-red-300 font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              onClick={() => act('vote', { type: 'down' })}
              title={r.myVote === 'down' ? 'Click again to remove your downvote' : 'Downvote'}
            >
              👎 {r.downvotes}
            </button>

            {/* Verification Section: only available if issue is in 'reported' status */}
            {r.status === 'reported' ? (
              !r.iVerified && r.verifications < 3 && !r.mine ? (
                <button
                  className="text-xs font-semibold py-1 px-2.5 rounded-full border transition-all cursor-pointer bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                  title="Verify this on-ground issue (requires physical proximity within 250m)"
                  onClick={handleVerify}
                >
                  Verify ({r.verifications}/3)
                </button>
              ) : r.verifications > 0 ? (
                <span
                  className="text-[11px] font-semibold text-slate-500 py-1 px-2.5 rounded-full bg-slate-50 border border-slate-200/80 inline-flex items-center gap-1"
                  title={`${r.verifications} on-ground citizen verification(s)`}
                >
                  👥 {r.verifications}/3 verified
                </span>
              ) : null
            ) : null}

            <span className={`status status-${r.status} ml-auto text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shrink-0`}>
              {statusLabel(r.status)}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 mt-2 flex items-center gap-2">
            <button
              className="flex-1 py-2 px-3 rounded-full text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs"
              onClick={() => setShowAnalysisModal(true)}
            >
              <span>📋</span> View in Details
            </button>
            {onLocate && (
              <button
                type="button"
                className="py-2 px-3 rounded-full text-xs font-bold text-blue-700 bg-blue-50/90 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs hover:shadow-xs shrink-0"
                onClick={() => onLocate(r)}
                title="Locate this incident on the map above"
              >
                <span>📍</span> Locate on Map
              </button>
            )}
          </div>
        </div>
      </div>

      {showAnalysisModal && (
        <ReportAnalysisModal
          report={r}
          onClose={() => setShowAnalysisModal(false)}
          onUpdate={(updated) => onChange && onChange(updated)}
        />
      )}
    </article>
  );
}
