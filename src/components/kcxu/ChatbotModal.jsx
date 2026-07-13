import { useState, useRef, useEffect } from 'react';
import { t } from '@/lib/i18n';
import { X, Mic, MicOff, Send, Radio, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { base44 as sdk } from '@/api/base44Client';
import HeygenAvatarSession from './HeygenAvatarSession';

const GREETING = "Hi! Welcome to KCXU Connect. Thanks for calling in to share your voice. May I have your name please?";
const CLOSING = "Your voice matters. We may feature your comments on our broadcast. Thank you for calling KCXU Connect.";
const FALLBACK_TOPIC = "the top issues facing Santa Clara County this week";

export default function ChatbotModal({ lang, mode, verification, onClose, onQueued }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState('name');
  const [userData, setUserData] = useState({ name: '' });
  const [weeklyTopic, setWeeklyTopic] = useState(FALLBACK_TOPIC);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  const speakRef = useRef(null);
  const greetedRef = useRef(false);

  const handleSpeakReady = (fn) => {
    speakRef.current = fn;
    if (!greetedRef.current) {
      greetedRef.current = true;
      addMsg('bot', GREETING);
    }
  };

  const addMsg = (role, text) => {
    setMessages(prev => [...prev, { role, text, id: Date.now() + Math.random() }]);
    if (role === 'bot' && speakRef.current) speakRef.current(text);
  };

  useEffect(() => {
    const loadTopic = async () => {
      try {
        const pinned = await base44.entities.CommunityIssue.filter({ status: 'approved', is_pinned: true }, 'pin_rank', 1);
        if (pinned.length > 0) setWeeklyTopic(pinned[0].title);
      } catch (err) { /* keep fallback topic */ }
    };
    loadTopic();
    if (mode !== 'avatar') {
      setTimeout(() => {
        greetedRef.current = true;
        addMsg('bot', GREETING);
      }, 400);
    }
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

    if (step === 'name') {
      const callerName = text;
      setUserData(d => ({ ...d, name: callerName }));
      addMsg('bot', `Thanks, ${callerName}. I've got that.`);
      await new Promise(r => setTimeout(r, 500));
      addMsg('bot', `This week we're hearing from community members about ${weeklyTopic}. What's your opinion on this?`);
      setStep('opinion');
    } else if (step === 'opinion') {
      const callerName = userData.name;
      addMsg('bot', `Thanks for sharing that, ${callerName}.`);
      await new Promise(r => setTimeout(r, 500));
      addMsg('bot', CLOSING);
      await submitOpinion(callerName, text);
    }
    setLoading(false);
  };

  const submitOpinion = async (name, opinionText) => {
    try {
      const record = await base44.entities.CommunityIssue.create({
        title: weeklyTopic,
        description: opinionText,
        submitter_name: name,
        submitter_phone: verification?.phone || '',
        submitter_language: lang
      });
      onQueued && onQueued(record);
      setStep('done');
    } catch (err) {
      addMsg('bot', 'Something went wrong. Please try again.');
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
        {mode === 'avatar' && <HeygenAvatarSession onSpeakReady={handleSpeakReady} />}
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