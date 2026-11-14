import { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import { useToast } from './Toast.jsx';

export default function VoiceInputButton({ onTranscript, className = '', title = 'Dictate by speaking' }) {
  const toast = useToast();
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const toggleListening = (e) => {
    e?.preventDefault?.();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice dictation is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = navigator.language || 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        toast.success('🎙️ Microphone active: speak now...');
      };

      recognition.onresult = (event) => {
        let chunk = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            chunk += event.results[i][0].transcript;
          }
        }
        if (chunk && chunk.trim()) {
          onTranscript?.(chunk.trim());
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          toast.error('Microphone permission denied. Please allow microphone access in browser settings.');
        } else if (event.error !== 'no-speech') {
          toast.error(`Voice recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error(err);
      toast.error('Could not initialize microphone for voice input');
      setIsListening(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
        isListening
          ? 'bg-red-500 text-white animate-pulse border border-red-600 shadow-sm'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:text-slate-900'
      } ${className}`}
      title={isListening ? 'Click to stop listening' : title}
    >
      {isListening ? (
        <>
          <FaMicrophoneSlash className="text-xs" />
          <span>Listening... (Tap to stop)</span>
        </>
      ) : (
        <>
          <FaMicrophone className="text-xs text-red-500" />
          <span>Voice Dictate</span>
        </>
      )}
    </button>
  );
}
