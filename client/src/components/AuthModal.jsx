import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { IoClose } from 'react-icons/io5';
import { BsBuilding, BsShieldCheck } from 'react-icons/bs';
import { FaUserCheck } from 'react-icons/fa';

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthModalOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleDemo = async (demoEmail, demoPass = 'Passw0rd!demo') => {
    setLoading(true);
    setError('');
    try {
      await login(demoEmail, demoPass);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={closeAuthModal}
      className="fixed inset-0 z-[200] overflow-y-auto bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white shadow-2xl relative border border-slate-100 my-auto animate-in zoom-in-95 duration-150"
      >
        <button
          onClick={closeAuthModal}
          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer absolute top-4 right-4"
          aria-label="Close modal"
        >
          <IoClose size={18} />
        </button>

        {/* Logo & Header */}
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl flex items-center justify-center shadow-xs">
            <BsBuilding size={16} />
          </div>
          <span className="font-semibold text-base text-slate-800 tracking-tight">
            SmartCity<span className="text-blue-600 font-bold">.ai</span>
          </span>
        </div>

        <h1 className="text-2xl font-bold text-center text-slate-900 mb-5">
          {mode === 'login' ? 'Sign In to Your Account' : 'Create Citizen Account'}
        </h1>

        {/* 1-Click Quick Demo Sign-Ins */}
        <div className="mb-4 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center mb-2">
            Instant Demo Sign-In
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemo('citizen@smartcity.test')}
              className="py-2 px-1 text-xs font-semibold rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 shadow-2xs flex flex-col items-center gap-1 transition hover:bg-slate-50 cursor-pointer"
            >
              <FaUserCheck className="text-emerald-600" size={14} />
              Citizen
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemo('authority@smartcity.test')}
              className="py-2 px-1 text-xs font-semibold rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 shadow-2xs flex flex-col items-center gap-1 transition hover:bg-slate-50 cursor-pointer"
            >
              <BsBuilding className="text-blue-600" size={14} />
              PWD Officer
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemo('admin@smartcity.test')}
              className="py-2 px-1 text-xs font-semibold rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 shadow-2xs flex flex-col items-center gap-1 transition hover:bg-slate-50 cursor-pointer"
            >
              <BsShieldCheck className="text-purple-600" size={14} />
              Admin
            </button>
          </div>
        </div>

        <div className="relative flex py-1 items-center mb-4">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">or with credentials</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Custom Email/Password Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'register' && (
            <div>
              <input
                required
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>
          )}

          <div>
            <input
              required
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </div>

          <div>
            <input
              required
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-sm py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-full font-semibold text-sm shadow-md transition cursor-pointer mt-1 ${
              loading
                ? 'bg-slate-400 text-white cursor-not-allowed'
                : 'bg-black text-white hover:bg-slate-800'
            }`}
          >
            {loading ? 'Connecting' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-5">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
            className="font-semibold text-blue-600 hover:underline cursor-pointer ml-1"
          >
            {mode === 'login' ? 'Create one now' : 'Sign in here'}
          </button>
        </p>
      </div>
    </div>
  );
}
