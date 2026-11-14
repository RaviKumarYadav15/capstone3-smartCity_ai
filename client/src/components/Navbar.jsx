import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { BsBuilding, BsShieldCheck } from 'react-icons/bs';
import { FaUserAstronaut } from 'react-icons/fa';
import { HiOutlineLogout } from 'react-icons/hi';

export default function Navbar() {
  const { user, logout, openAuthModal } = useAuth();
  const [showUserPopUp, setShowUserPopUp] = useState(false);
  const navRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setShowUserPopUp(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setShowUserPopUp(false);
    navigate('/');
  };

  return (
    <div className="bg-[#f3f3f3] flex justify-center px-4 pt-6 transition-all relative z-50">
      <div className="w-full max-w-6xl bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50 rounded-3xl shadow-sm border border-slate-200/90 px-6 sm:px-8 py-3.5 flex justify-between items-center relative transition-all duration-300">
        
        {/* Brand */}
        <div onClick={() => navigate('/')} className="flex items-center gap-3 cursor-pointer">
          <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl flex items-center justify-center shadow-xs">
            <BsBuilding size={18} />
          </div>
          <span className="font-semibold text-lg text-slate-800 tracking-tight">
            SmartCity<span className="text-blue-600 font-bold">.ai</span>
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-4 py-1.5 rounded-full text-sm font-medium transition ${
                isActive
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/report"
            className={({ isActive }) =>
              `px-4 py-1.5 rounded-full text-sm font-medium transition ${
                isActive
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`
            }
          >
            Report Issue
          </NavLink>
          <NavLink
            to="/map"
            className={({ isActive }) =>
              `px-4 py-1.5 rounded-full text-sm font-medium transition ${
                isActive
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`
            }
          >
            City Issues Map
          </NavLink>
          <NavLink
            to="/tenders"
            className={({ isActive }) =>
              `px-4 py-1.5 rounded-full text-sm font-medium transition ${
                isActive
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`
            }
          >
            Public Tenders
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `px-4 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white text-purple-700 shadow-xs font-semibold'
                    : 'text-purple-700 hover:bg-white/50'
                }`
              }
            >
              <BsShieldCheck size={14} />
              Admin
            </NavLink>
          )}
        </nav>

        {/* User Profile Avatar with PopUp */}
        <div ref={navRef} className="flex items-center gap-3 relative">
          {!user ? (
            <button
              onClick={openAuthModal}
              className="bg-black hover:bg-slate-800 text-white text-xs font-medium py-2 px-5 rounded-full shadow-xs transition cursor-pointer"
            >
              Sign In
            </button>
          ) : (
            <div className="relative flex flex-col items-end">
              <button
                onClick={() => setShowUserPopUp(!showUserPopUp)}
                className="w-9 h-9 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-full flex items-center justify-center font-bold text-sm cursor-pointer hover:scale-105 transition shadow-xs"
                aria-label="User menu"
              >
                {user.name?.slice(0, 1).toUpperCase()}
              </button>

              {showUserPopUp && (
                <div className="absolute top-full mt-3 right-0 bg-white border border-slate-200 shadow-xl rounded-2xl p-4 w-60 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="mb-3 border-b border-slate-100 pb-3">
                    <p className="font-bold text-slate-800 text-sm truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    <span className="inline-block mt-1 text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {user.role}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setShowUserPopUp(false);
                      navigate('/report');
                    }}
                    className="w-full text-left text-xs font-semibold py-2 px-2 hover:text-black text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer transition"
                  >
                    📸 Report an Issue
                  </button>

                  <button
                    onClick={() => {
                      setShowUserPopUp(false);
                      navigate('/map');
                    }}
                    className="w-full text-left text-xs font-semibold py-2 px-2 hover:text-black text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer transition"
                  >
                    🗺️ City Issues Map
                  </button>

                  <button
                    onClick={() => {
                      setShowUserPopUp(false);
                      navigate('/tenders');
                    }}
                    className="w-full text-left text-xs font-semibold py-2 px-2 hover:text-black text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer transition"
                  >
                    🏛️ Public Tenders
                  </button>

                  {user.role === 'admin' && (
                    <button
                      onClick={() => {
                        setShowUserPopUp(false);
                        navigate('/admin');
                      }}
                      className="w-full text-left text-xs font-semibold py-2 px-2 text-purple-700 hover:bg-purple-50 rounded-lg cursor-pointer transition"
                    >
                      🛡️ Administration Console
                    </button>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 text-red-600 text-xs font-semibold py-2 px-2 hover:bg-red-50 rounded-lg cursor-pointer transition border-t border-slate-100 mt-1 pt-2"
                  >
                    <HiOutlineLogout size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
