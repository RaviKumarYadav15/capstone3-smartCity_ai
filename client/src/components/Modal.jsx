import { useEffect, useRef } from 'react';
import { IoClose } from 'react-icons/io5';

export default function Modal({ title, onClose, wide, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = originalOverflow;
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] overflow-y-auto bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 md:p-8 animate-in fade-in duration-150"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`relative w-full ${
          wide ? 'max-w-3xl' : 'max-w-lg'
        } bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto focus:outline-none my-auto`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 m-0 tracking-tight">{title}</h2>
          <button
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
            onClick={onClose}
          >
            <IoClose size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
