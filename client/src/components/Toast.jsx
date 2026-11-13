import { Toaster, toast as hotToast } from 'react-hot-toast';

const smartToast = (message, opts) => {
  if (!message) return;
  const str = String(message);
  const isError = /error|fail|reject|cannot|invalid|denied|blocked|unreachable|please sign in/i.test(str);
  const isSuccess = /success|created|submitted|verified|saved|updated|copied|done|confirmed|granted/i.test(str);
  if (isError) return hotToast.error(str, opts);
  if (isSuccess) return hotToast.success(str, opts);
  return hotToast(str, opts);
};

// Forward hotToast methods (success, error, loading, promise, dismiss, etc.)
Object.assign(smartToast, hotToast);

export const toast = smartToast;
export const useToast = () => smartToast;

export function ToastProvider({ children }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={12}
        containerStyle={{
          top: 24,
          right: 24,
        }}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#0f172a',
            padding: '12px 18px',
            borderRadius: '16px',
            fontSize: '13.5px',
            fontWeight: '600',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0',
            maxWidth: '420px',
            fontFamily: 'inherit',
          },
          success: {
            duration: 3500,
            iconTheme: {
              primary: '#059669',
              secondary: '#ffffff',
            },
            style: {
              border: '1px solid #a7f3d0',
              background: '#f0fdf4',
              color: '#065f46',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#dc2626',
              secondary: '#ffffff',
            },
            style: {
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#991b1b',
            },
          },
        }}
      />
    </>
  );
}
