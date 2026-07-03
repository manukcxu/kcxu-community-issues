import { useState } from 'react';
import { t } from '@/lib/i18n';
import { X, Plus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function IssueSubmitModal({ lang, verification, onClose }) {
  const [issues, setIssues] = useState([{ title: '', description: '' }]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const updateIssue = (idx, field, val) => {
    setIssues(prev => prev.map((iss, i) => i === idx ? { ...iss, [field]: val } : iss));
  };

  const addIssue = () => {
    if (issues.length < 3) setIssues(prev => [...prev, { title: '', description: '' }]);
  };

  const removeIssue = (idx) => {
    if (issues.length > 1) setIssues(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      for (const issue of issues.filter(i => i.title.trim())) {
        await base44.entities.CommunityIssue.create({
          title: issue.title,
          description: issue.description,
          submitter_name: verification.name,
          submitter_phone: verification.phone,
          submitter_language: lang,
          status: 'pending',
          vote_count: 0
        });
      }
      setSuccess(true);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-[#F5C200] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✓</span>
          </div>
          <h3 className="text-[#2D2D2D] font-black text-xl mb-2">{t(lang, 'success_issue')}</h3>
          <button onClick={onClose} className="mt-4 w-full bg-[#2D2D2D] text-white font-bold py-3 rounded-xl">{t(lang, 'form_cancel')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="bg-[#2D2D2D] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">{t(lang, 'issue_title')}</h2>
            <p className="text-gray-400 text-xs mt-0.5">{t(lang, 'issue_subtitle')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {issues.map((issue, idx) => (
            <div key={idx} className="border border-gray-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#F5C200] uppercase tracking-wider">{t(lang, 'issue_label')} {idx + 1}</span>
                {issues.length > 1 && (
                  <button type="button" onClick={() => removeIssue(idx)} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <input
                value={issue.title}
                onChange={e => updateIssue(idx, 'title', e.target.value)}
                placeholder={t(lang, 'issue_title_field')}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C200]"
              />
              <textarea
                value={issue.description}
                onChange={e => updateIssue(idx, 'description', e.target.value)}
                placeholder={t(lang, 'issue_desc_field')}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C200] resize-none"
              />
            </div>
          ))}
          {issues.length < 3 && (
            <button type="button" onClick={addIssue} className="w-full py-3 border-2 border-dashed border-[#F5C200] rounded-2xl text-[#2D2D2D] font-semibold text-sm hover:bg-[#F5C200]/5 transition-colors flex items-center justify-center gap-2">
              <Plus size={16} /> {t(lang, 'issue_add')}
            </button>
          )}
          <button type="submit" disabled={loading} className="w-full bg-[#F5C200] text-[#2D2D2D] font-bold py-3 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50">
            {loading ? '...' : t(lang, 'form_submit')}
          </button>
        </form>
      </div>
    </div>
  );
}