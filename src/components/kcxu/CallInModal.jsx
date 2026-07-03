import { useState } from 'react';
import { t } from '@/lib/i18n';
import { X, MessageSquare, User } from 'lucide-react';
import ChatbotModal from './ChatbotModal';

export default function CallInModal({ lang, verification, onClose }) {
  const [mode, setMode] = useState(null);
  const [queued, setQueued] = useState(null);

  if (queued) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-[#F5C200] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-[#2D2D2D] font-black text-2xl">#{queued.queue_position}</span>
          </div>
          <h3 className="text-[#2D2D2D] font-black text-xl mb-2">{t(lang, 'success_callin')}</h3>
          <p className="text-gray-500 text-sm">{t(lang, 'queue_position')}: #{queued.queue_position}</p>
          <button onClick={onClose} className="mt-6 w-full bg-[#2D2D2D] text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors">
            {t(lang, 'form_cancel')}
          </button>
        </div>
      </div>
    );
  }

  if (mode) {
    return <ChatbotModal lang={lang} mode={mode} verification={verification} onClose={onClose} onQueued={setQueued} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-[#2D2D2D] px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">{t(lang, 'chatbot_title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-gray-500 text-sm mb-6 text-center">Choose how you'd like to connect with the KCXU host</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMode('text')}
              className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-2xl hover:border-[#F5C200] hover:bg-[#F5C200]/5 transition-all group"
            >
              <div className="w-12 h-12 bg-[#F5C200]/20 rounded-full flex items-center justify-center group-hover:bg-[#F5C200]/40 transition-colors">
                <MessageSquare className="text-[#2D2D2D]" size={24} />
              </div>
              <div className="text-center">
                <p className="font-bold text-[#2D2D2D] text-sm">{t(lang, 'chatbot_mode_a')}</p>
                <p className="text-gray-500 text-xs mt-1">{t(lang, 'chatbot_mode_a_desc')}</p>
              </div>
            </button>
            <button
              onClick={() => setMode('avatar')}
              className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-2xl hover:border-[#F5C200] hover:bg-[#F5C200]/5 transition-all group"
            >
              <div className="w-12 h-12 bg-[#F5C200]/20 rounded-full flex items-center justify-center group-hover:bg-[#F5C200]/40 transition-colors">
                <User className="text-[#2D2D2D]" size={24} />
              </div>
              <div className="text-center">
                <p className="font-bold text-[#2D2D2D] text-sm">{t(lang, 'chatbot_mode_b')}</p>
                <p className="text-gray-500 text-xs mt-1">{t(lang, 'chatbot_mode_b_desc')}</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}