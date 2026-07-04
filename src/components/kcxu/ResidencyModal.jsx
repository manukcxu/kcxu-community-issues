import { useState } from 'react';
import { t } from '@/lib/i18n';
import { X, MapPin } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ResidencyModal({ lang, onVerified, onClose }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [declared, setDeclared] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!declared || !name || !phone) return;
    setLoading(true);
    setError(null);
    try {
      const existing = await base44.entities.ResidentVerification.filter({ phone });
      if (existing.length === 0) {
        await base44.entities.ResidentVerification.create({ name, phone, language: lang, declared: true });
      }
      const verification = { name, phone, lang, verified: true, timestamp: Date.now() };
      sessionStorage.setItem('kcxu_verified', JSON.stringify(verification));
      onVerified(verification);
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-[#2D2D2D] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="text-[#D32F2F]" size={22} />
            <h2 className="text-white font-bold text-lg">{t(lang, 'residency_title')}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-gray-600 text-sm leading-relaxed">{t(lang, 'residency_text')}</p>
          <div>
            <label className="block text-sm font-semibold text-[#2D2D2D] mb-1">{t(lang, 'form_name')}</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#2D2D2D] bg-white focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#2D2D2D] mb-1">{t(lang, 'form_phone')}</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              type="tel"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#2D2D2D] bg-white focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent"
            />
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={declared}
              onChange={e => setDeclared(e.target.checked)}
              className="mt-1 accent-[#D32F2F] w-4 h-4"
            />
            <span className="text-sm text-[#2D2D2D] font-medium">{t(lang, 'residency_declare')}</span>
          </label>
          {error && <p className="text-[#D32F2F] text-sm font-medium">{error}</p>}
          <button
            type="submit"
            disabled={!declared || !name || !phone || loading}
            className="w-full bg-[#D32F2F] text-white font-bold py-3 rounded-xl hover:bg-[#B71C1C] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? '...' : t(lang, 'residency_confirm')}
          </button>
        </form>
      </div>
    </div>
  );
}