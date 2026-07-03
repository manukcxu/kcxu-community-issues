import { useState } from 'react';
import { t } from '@/lib/i18n';
import { X, Music } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function SongRequestModal({ lang, onClose }) {
  const [form, setForm] = useState({ name: '', phone: '', song_title: '', artist: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.entities.SongRequest.create({ ...form, language: lang, status: 'pending' });
      setSuccess(true);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-[#F5C200] rounded-full flex items-center justify-center mx-auto mb-4">
            <Music size={28} className="text-[#2D2D2D]" />
          </div>
          <h3 className="text-[#2D2D2D] font-black text-xl mb-2">{t(lang, 'success_song')}</h3>
          <button onClick={onClose} className="mt-4 w-full bg-[#2D2D2D] text-white font-bold py-3 rounded-xl">{t(lang, 'form_cancel')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-[#2D2D2D] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Music className="text-[#F5C200]" size={20} />
            <div>
              <h2 className="text-white font-bold">{t(lang, 'song_title')}</h2>
              <p className="text-gray-400 text-xs">{t(lang, 'song_subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {[
            { key: 'name', label: 'form_name' },
            { key: 'phone', label: 'form_phone', type: 'tel' },
            { key: 'song_title', label: 'form_song' },
            { key: 'artist', label: 'form_artist' }
          ].map(({ key, label, type = 'text' }) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-[#2D2D2D] mb-1">{t(lang, label)}</label>
              <input
                type={type}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C200]"
              />
            </div>
          ))}
          <button type="submit" disabled={loading} className="w-full bg-[#F5C200] text-[#2D2D2D] font-bold py-3 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50">
            {loading ? '...' : t(lang, 'form_submit')}
          </button>
        </form>
      </div>
    </div>
  );
}