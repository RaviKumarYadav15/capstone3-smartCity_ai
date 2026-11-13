import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';
import { EMOJI, formatINR } from '../utils/format.js';
import { BsBuilding, BsShieldCheck, BsCamera, BsCheckCircle, BsArrowRight } from 'react-icons/bs';

export default function Home() {
  const { user, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/stats').then(setStats).catch(() => {});
  }, []);
  const r = stats?.reports;

  const handleReportClick = () => {
    if (!user) {
      openAuthModal();
    } else {
      navigate('/report');
    }
  };

  const steps = [
    {
      icon: <BsCamera size={22} />,
      step: 'STEP 1',
      title: 'Snap & Smart AI Validation',
      desc: 'Upload issue photo — AI checks authenticity, identifies department, and flags priority',
    },
    {
      icon: <BsCheckCircle size={22} />,
      step: 'STEP 2',
      title: 'Community Consensus',
      desc: 'Neighbors vote and peer-verify — 3 neighbor verifications automatically triggers review',
    },
    {
      icon: <BsShieldCheck size={22} />,
      step: 'STEP 3',
      title: 'Public Works Audit',
      desc: 'Read tenders in plain words with rate benchmarks and Defect Liability tracking',
    },
  ];

  return (
    <div className="flex flex-col gap-16 pt-4 pb-12">
      {/* Hero Section */}
      <div className="text-center pt-8 sm:pt-12 pb-2">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold max-w-4xl mx-auto leading-tight md:leading-snug text-slate-900 tracking-tight">
          Transform Your City with{' '}
          <span className="relative inline-block mt-2 md:mt-0">
            <span className="bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 rounded-r-4xl px-4 py-1">
              Civic Intelligence
            </span>
          </span>
        </h1>

        <p className="text-slate-500 mt-6 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
          Report civic infrastructure issues with smart AI validation, track repair progress, and audit municipal tenders in plain language
        </p>

        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <button
            onClick={handleReportClick}
            className="bg-gradient-to-b from-blue-900 to-blue-500 text-white px-8 py-3.5 rounded-full shadow-md hover:opacity-95 transition flex items-center gap-2 cursor-pointer font-medium text-sm md:text-base"
          >
            <BsCamera size={18} />
            <span>Report an Issue</span>
          </button>

          <button
            onClick={() => navigate('/tenders')}
            className="bg-white border border-blue-200 text-blue-600 px-8 py-3.5 rounded-full hover:bg-gradient-to-br from-blue-50 to-blue-100 transition flex items-center gap-2 cursor-pointer font-medium text-sm md:text-base shadow-xs"
          >
            <BsBuilding size={18} />
            <span>Audit Tenders</span>
          </button>
        </div>
      </div>

      {/* How It Works - Process Section */}
      <div className="w-full max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">
            How Civic Intelligence Works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-3xl border border-slate-200/80 hover:border-blue-300 p-8 shadow-xs hover:shadow-md transition-all flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 shadow-2xs flex items-center justify-center text-blue-600 text-xl mb-4">
                {item.icon}
              </div>

              <span className="text-xs text-blue-600 font-bold tracking-wider uppercase mb-1.5">
                {item.step}
              </span>
              <h3 className="font-semibold text-lg text-slate-800 mb-2">
                {item.title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Live City Impact Overview */}
      <div className="w-full max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">
            Live City Impact Overview
          </h2>
        </div>

        {/* Clean 4-Metric Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 text-center shadow-xs">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Health Index</span>
            <div className="text-3xl font-bold text-slate-900">{stats?.health.score ?? 83}<span className="text-sm font-normal text-slate-400">/100</span></div>
            <span className="inline-block mt-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {stats?.health.label ?? 'Good'}
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 text-center shadow-xs">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Total Reports</span>
            <div className="text-3xl font-bold text-slate-900">{r?.total ?? 0}</div>
            <span className="inline-block mt-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Verified Issues
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 text-center shadow-xs">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Public Tenders</span>
            <div className="text-3xl font-bold text-slate-900">{stats?.tenders.count ?? 0}</div>
            <span className="inline-block mt-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              Active Contracts
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 text-center shadow-xs">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Budget Monitored</span>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {stats ? formatINR(stats.tenders.totalBudget) : '₹1.00 Cr'}
            </div>
            <span className="inline-block mt-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              PWD Allocations
            </span>
          </div>
        </div>

        {/* Detailed Health & Category Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-slate-900 m-0">Neighborhood Health Score</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    stats.health.score >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    stats.health.score >= 60 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {stats.health.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold text-slate-900 tracking-tight">{stats.health.score}</span>
                  <span className="text-sm font-semibold text-slate-500">/ 100 Overall Health</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden my-3 border border-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      stats.health.score >= 80 ? 'bg-emerald-500' :
                      stats.health.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${stats.health.score}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mt-3">
                  Score updates automatically based on reported hazards and prompt repairs — resolving issues instantly restores the score
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-500">Live grid status</span>
                <button
                  onClick={() => navigate('/map')}
                  className="text-blue-600 hover:text-blue-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <span>View Map Details</span>
                  <BsArrowRight size={12} />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Issues by Category</h3>
                {stats.categories.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6 text-center">No civic reports filed yet</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {stats.categories.map((c) => {
                      const pct = Math.round((c.count / (stats.reports.total || 1)) * 100);
                      return (
                        <div className="flex items-center gap-3 text-sm" key={c.category}>
                          <span className="w-36 font-medium text-slate-700 truncate text-xs">
                            {EMOJI[c.category] || '⚠️'} {c.category}
                          </span>
                          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-14 text-right font-semibold text-slate-800 text-xs">{c.count} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-500">{stats.reports.total} total reported issues</span>
                <button
                  onClick={() => navigate('/report')}
                  className="text-blue-600 hover:text-blue-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <span>File New Report</span>
                  <BsArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
