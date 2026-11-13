import { BsBuilding, BsGithub, BsLinkedin } from 'react-icons/bs';
import { FaXTwitter } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-[#ebebeb] border-t border-slate-300/70 pt-16 pb-10 mt-auto">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl flex items-center justify-center shadow-xs">
                <BsBuilding size={18} />
              </div>
              <span className="font-semibold text-xl text-slate-800 tracking-tight">
                SmartCity<span className="text-blue-600 font-bold">.ai</span>
              </span>
            </div>
            <p className="text-slate-500 max-w-sm text-sm leading-relaxed">
              Transparent municipal incident reporting, crowd-verified infrastructure health, and public works tender auditing
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-800 text-sm mb-4">Quick Navigation</h4>
            <ul className="flex flex-col gap-2.5 text-sm text-slate-500">
              <li><Link to="/" className="hover:text-blue-600 transition">Civic Dashboard</Link></li>
              <li><Link to="/report" className="hover:text-blue-600 transition">Report an Issue</Link></li>
              <li><Link to="/map" className="hover:text-blue-600 transition">Live Incident Map</Link></li>
              <li><Link to="/tenders" className="hover:text-blue-600 transition">Public Works Tenders</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-800 text-sm mb-4">Civic Redressal</h4>
            <ul className="flex flex-col gap-2.5 text-sm text-slate-500">
              <li><a href="#" className="hover:text-blue-600 transition">RTI Act Guidelines</a></li>
              <li><a href="#" className="hover:text-blue-600 transition">Public Works Manual</a></li>
              <li><a href="#" className="hover:text-blue-600 transition">Defect Liability Rules</a></li>
              <li><a href="#" className="hover:text-blue-600 transition">Citizen Redressal Charter</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-slate-300/60 gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Smart City Civic OS — Empowering community governance</p>
          <div className="flex items-center gap-5 text-slate-500">
            <a href="https://github.com" className="hover:text-slate-800 transition cursor-pointer">
              <BsGithub size={18} />
            </a>
            <a href="https://linkedin.com" className="hover:text-blue-600 transition cursor-pointer">
              <BsLinkedin size={18} />
            </a>
            <a href="https://x.com" className="hover:text-slate-800 transition cursor-pointer">
              <FaXTwitter size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
