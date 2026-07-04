import { useState, useRef, useEffect } from 'react';
import { t } from '@/lib/i18n';
import { X, Mic, MicOff, Send, Radio, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { base44 as sdk } from '@/api/base44Client';
import HeygenAvatarSession from './HeygenAvatarSession';

const STEPS = ['greeting', 'residency', 'name', 'phone', 'song_ask', 'song_details', 'confirm'];

export default function ChatbotModal({ lang, mode, verification, onClose, onQueued }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState('greeting');
  const [userData, setUserData] = useState({
    name: verification?.name || '',
    phone: verification?.phone || '',
    wantsSong: false,
    songTitle: '',
    songArtist: ''
  });
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  const speakRef = useRef(null);

  const addMsg = (role, text) => {
    setMessages(prev => [...prev, { role, text, id: Date.now() + Math.random() }]);
    if (role === 'bot' && speakRef.current) speakRef.current(text);
  };

  useEffect(() => {
    setTimeout(() => addMsg('bot', t(lang, 'chatbot_greeting')), 400);
    setTimeout(() => {
      if (verification) {
        addMsg('bot', lang === 'en'
          ? `I see you're already verified, ${verification.name}! Would you like to make a song request before joining the queue?`
          : t(lang, 'chatbot_greeting'));
        setStep('song_ask');
      } else {
        setStep('residency');
      }
    }, 900);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMsg = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    addMsg('user', text);
    await processStep(text);
  };

  const processStep = async (text) => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));

    if (step === 'residency') {
      const yes = /yes|si|có|是|oo|yeah|y/i.test(text);
      if (yes) {
        addMsg('bot', lang === 'en' ? 'Great! What\'s your name?' : t(lang, 'form_name') + '?');
        setStep('name');
      } else {
        addMsg('bot', lang === 'en' ? 'Sorry, this service is for Santa Clara County residents only.' : t(lang, 'residency_declare'));
        setTimeout(onClose, 2000);
      }
    } else if (step === 'name') {
      setUserData(d => ({ ...d, name: text }));
      addMsg('bot', lang === 'en' ? `Nice to meet you, ${text}! What\'s your phone number?` : t(lang, 'form_phone') + '?');
      setStep('phone');
    } else if (step === 'phone') {
      setUserData(d => ({ ...d, phone: text }));
      addMsg('bot', lang === 'en' ? 'Would you like to request a song? (yes/no)' : t(lang, 'song_btn') + '?');
      setStep('song_ask');
    } else if (step === 'song_ask') {
      const yes = /yes|si|có|是|oo|yeah|y/i.test(text);
      if (yes) {
        addMsg('bot', lang === 'en' ? 'What song and artist would you like to request?' : t(lang, 'form_song'));
        setStep('song_details');
      } else {
        await submitToQueue({ ...userData, wantsSong: false });
      }
    } else if (step === 'song_details') {
      setUserData(d => ({ ...d, songTitle: text, wantsSong: true }));
      addMsg('bot', lang === 'en' ? "Got it! What's the artist's name?" : t(lang, 'form_artist') + '?');
      setStep('song_artist');
    } else if (step === 'song_artist') {
      await submitToQueue({ ...userData, songTitle: userData.songTitle, songArtist: text, wantsSong: true });
    }
    setLoading(false);
  };

  const submitToQueue = async (data) => {
    try {
      const existing = await base44.entities.CallerQueue.filter({ phone: data.phone, status: 'queued' });
      if (existing.length > 0) {
        addMsg('bot', lang === 'en' ? `You\'re already in the queue at position #${existing[0].queue_position}!` : t(lang, 'success_callin'));
        onQueued && onQueued(existing[0]);
        return;
      }
      const allQueued = await base44.entities.CallerQueue.filter({ status: 'queued' });
      const position = allQueued.length + 1;
      const record = await base44.entities.CallerQueue.create({
        name: data.name || verification?.name,
        phone: data.phone || verification?.phone,
        language: lang,
        connection_type: 'webrtc',
        song_request_artist: data.songArtist || '',
        song_request_title: data.songTitle || '',
        status: 'queued',
        queue_position: position,
        residency_declared: true,
        chatbot_mode: mode
      });
      addMsg('bot', `${t(lang, 'success_callin')} ${t(lang, 'queue_position')}: #${position}`);
      onQueued && onQueued(record);
      setStep('done');
    } catch (err) {
      addMsg('bot', lang === 'en' ? 'Something went wrong. Please try again.' : 'Error. Try again.');
    }
  };

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice not supported in this browser');
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    const langMap = { en: 'en-US', es: 'es-US', vi: 'vi-VN', zh: 'zh-CN', tl: 'fil-PH' };
    recognition.lang = langMap[lang] || 'en-US';
    recognition.continuous = false;
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="bg-[#2D2D2D] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="text-[#D32F2F]" size={20} />
            <span className="text-white font-bold">{t(lang, 'chatbot_title')}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        {mode === 'avatar' && <HeygenAvatarSession onSpeakReady={(fn) => { speakRef.current = fn; }} />}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50" style={{ minHeight: 280, maxHeight: 380 }}>
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`rounded-2xl px-4 py-2 max-w-[80%] text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#D32F2F] text-white font-medium'
                  : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[#D32F2F] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[#D32F2F] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-[#D32F2F] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="p-4 border-t border-gray-100 bg-white">
          <div className="flex gap-2 items-center">
            <button
              onClick={toggleVoice}
              className={`p-3 rounded-xl transition-colors ${listening ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {listening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMsg()}
              placeholder={t(lang, 'chatbot_type')}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F]"
              disabled={step === 'done'}
            />
            <button
              onClick={sendMsg}
              disabled={!input.trim() || step === 'done'}
              className="p-3 bg-[#D32F2F] text-white rounded-xl hover:bg-[#B71C1C] transition-colors disabled:opacity-40"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}