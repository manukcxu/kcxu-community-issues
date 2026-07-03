import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Radio, Phone, ChevronUp, Music, Calendar, Mic, Globe } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { LANGUAGES, t } from '@/lib/i18n';
import { useLanguage } from '@/lib/useLanguage';
import ResidencyModal from '@/components/kcxu/ResidencyModal';
import CallInModal from '@/components/kcxu/CallInModal';
import IssueSubmitModal from '@/components/kcxu/IssueSubmitModal';
import SongRequestModal from '@/components/kcxu/SongRequestModal';

export default function Landing() {
  const { lang, changeLang } = useLanguage();
  const [issues, setIssues] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [votes, setVotes] = useState([]);
  const [modal, setModal] = useState(null);
  const [verification, setVerification] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [votedIssues, setVotedIssues] = useState(new Set());

  useEffect(() => {
    const stored = sessionStorage.getItem('kcxu_verified');
    if (stored) setVerification(JSON.parse(stored));
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [approvedIssues, sched, issueVotes] = await Promise.all([
        base44.entities.CommunityIssue.filter({ status: 'approved' }, '-vote_count', 20),
        base44.entities.ShowSchedule.filter({ is_active: true }, 'date', 10),
        base44.entities.IssueVote.list('-created_date', 500)
      ]);
      setIssues(approvedIssues);
      setSchedule(sched);
      setVotes(issueVotes);
      if (sessionStorage.getItem('kcxu_verified')) {
        const v = JSON.parse(sessionStorage.getItem('kcxu_verified'));
        const myVotes = new Set(issueVotes.filter(vt => vt.voter_phone === v.phone).map(vt => vt.issue_id));
        setVotedIssues(myVotes);
      }
    } catch (e) { console.error(e); }
  };

  const top3 = [...issues].filter(i => i.is_pinned).sort((a, b) => (a.pin_rank || 99) - (b.pin_rank || 99)).slice(0, 3);
  const remaining = issues.filter(i => !top3.find(t => t.id === i.id));
  if (top3.length < 3) {
    const fill = [...issues].sort((a, b) => b.vote_count - a.vote_count).filter(i => !top3.find(t => t.id === i.id));
    while (top3.length < 3 && fill.length > 0) top3.push(fill.shift());
  }

  const requireVerification = (action) => {
    if (verification) {
      setModal(action);
    } else {
      setPendingAction(action);
      setModal('residency');
    }
  };

  const handleVerified = (v) => {
    setVerification(v);
    setModal(pendingAction);
    setPendingAction(null);
  };

  const handleVote = async (issue) => {
    if (!verification) {
      requireVerification('vote_' + issue.id);
      return;
    }
    if (votedIssues.has(issue.id)) return;
    try {
      await base44.entities.IssueVote.create({ issue_id: issue.id, voter_phone: verification.phone, voter_name: verification.name });
      await base44.entities.CommunityIssue.update(issue.id, { vote_count: (issue.vote_count || 0) + 1 });
      setVotedIssues(prev => new Set([...prev, issue.id]));
      loadData();
    } catch (e) { console.error(e); }
  };

  const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

  return (
    <div className="min-h-screen bg-[#2D2D2D] text-white">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#2D2D2D]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#F5C200] rounded-full flex items-center justify-center">
              <Radio size={18} className="text-[#2D2D2D]" />
            </div>
            <div>
              <div className="font-black text-white text-sm leading-none">KCXU 92.7 FM</div>
              <div className="text-[#F5C200] text-[9px] font-semibold tracking-widest uppercase">Santa Clara County</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#issues" className="text-gray-300 hover:text-[#F5C200] text-sm font-medium transition-colors">{t(lang, 'nav_issues')}</a>
            <a href="#schedule" className="text-gray-300 hover:text-[#F5C200] text-sm font-medium transition-colors">{t(lang, 'nav_schedule')}</a>
            <a href="#song" className="text-gray-300 hover:text-[#F5C200] text-sm font-medium transition-colors">{t(lang, 'nav_song')}</a>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => changeLang(l.code)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${lang === l.code ? 'bg-[#F5C200] text-[#2D2D2D]' : 'text-gray-400 hover:text-white'}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => requireVerification('callin')}
              className="hidden md:flex items-center gap-2 bg-[#F5C200] text-[#2D2D2D] font-bold px-4 py-2 rounded-xl hover:bg-yellow-400 transition-colors text-sm"
            >
              <Phone size={14} /> {t(lang, 'nav_callin')}
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#2D2D2D] to-[#1a1a1a]" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#F5C200]/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#F5C200]/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-10">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-1.5 rounded-full text-xs font-bold mb-6 animate-pulse">
                <span className="w-2 h-2 bg-white rounded-full" />
                {t(lang, 'live_now')}
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-4">
                {t(lang, 'hero_title')}
              </h1>
              <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-8">
                {t(lang, 'hero_subtitle')}
              </p>
            </motion.div>
          </div>

          {/* Radio Player */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.6, delay: 0.2 }} className="max-w-3xl mx-auto mb-10">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Radio size={16} className="text-[#F5C200]" />
                <span className="text-[#F5C200] text-sm font-bold uppercase tracking-wider">KCXU 92.7 FM — Live Stream</span>
              </div>
              <div className="rounded-2xl overflow-hidden bg-black/30">
                <iframe
                  src="https://player.radio.co/p/kcxu"
                  frameBorder="0"
                  allow="autoplay"
                  className="w-full h-20 md:h-24"
                  title="KCXU 92.7 FM Live Stream"
                />
              </div>
            </div>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.6, delay: 0.3 }} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => requireVerification('callin')}
              className="flex items-center gap-2 bg-[#F5C200] text-[#2D2D2D] font-black px-8 py-4 rounded-2xl hover:bg-yellow-400 transition-all hover:scale-105 text-base shadow-lg shadow-[#F5C200]/20"
            >
              <Mic size={20} /> {t(lang, 'hero_callin')}
            </button>
            <button
              onClick={() => requireVerification('issue')}
              className="flex items-center gap-2 border-2 border-[#F5C200] text-[#F5C200] font-black px-8 py-4 rounded-2xl hover:bg-[#F5C200] hover:text-[#2D2D2D] transition-all text-base"
            >
              {t(lang, 'hero_submit')}
            </button>
          </motion.div>
        </div>
      </section>

      {/* TOP 3 */}
      <section id="issues" className="py-16 bg-[#1a1a1a]">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6 }} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-2">{t(lang, 'top3_title')}</h2>
            <p className="text-gray-400">{t(lang, 'top3_subtitle')}</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[0, 1, 2].map(idx => {
              const issue = top3[idx];
              return (
                <motion.div key={idx} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6, delay: idx * 0.1 }}>
                  <div className={`rounded-3xl border-2 p-6 h-full ${idx === 0 ? 'border-[#F5C200] bg-[#F5C200]/10' : 'border-white/10 bg-white/5'}`}>
                    <div className={`text-5xl font-black mb-4 ${idx === 0 ? 'text-[#F5C200]' : 'text-gray-600'}`}>#{idx + 1}</div>
                    {issue ? (
                      <>
                        <h3 className="text-white font-bold text-lg mb-2 leading-snug">{issue.title}</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">{issue.description}</p>
                        <div className="mt-4 flex items-center gap-2">
                          <ChevronUp size={16} className="text-[#F5C200]" />
                          <span className="text-[#F5C200] font-bold text-sm">{issue.vote_count || 0} votes</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-600 text-sm italic">No issue yet — submit yours!</div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* VOTING SECTION */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6 }}>
            <h3 className="text-xl font-black text-white mb-2">{t(lang, 'vote_title')}</h3>
            <p className="text-gray-400 text-sm mb-6">{t(lang, 'vote_subtitle')}</p>
            <div className="space-y-3">
              {issues.length === 0 && (
                <div className="text-gray-500 text-sm py-6 text-center">No community issues yet. Be the first to submit one!</div>
              )}
              {issues.map(issue => (
                <div key={issue.id} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
                  <button
                    onClick={() => handleVote(issue)}
                    className={`flex flex-col items-center gap-1 min-w-[50px] py-2 px-3 rounded-xl transition-all ${
                      votedIssues.has(issue.id)
                        ? 'bg-[#F5C200] text-[#2D2D2D]'
                        : 'bg-white/10 text-gray-400 hover:bg-[#F5C200]/20 hover:text-[#F5C200]'
                    }`}
                  >
                    <ChevronUp size={16} />
                    <span className="text-xs font-bold">{issue.vote_count || 0}</span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{issue.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{issue.description}</p>
                  </div>
                  <span className="text-xs text-gray-600 hidden md:block">{votedIssues.has(issue.id) ? t(lang, 'voted_btn') : t(lang, 'vote_btn')}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* SCHEDULE */}
      <section id="schedule" className="py-16 bg-[#2D2D2D]">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6 }} className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-2 flex items-center justify-center gap-3">
              <Calendar className="text-[#F5C200]" size={32} />
              {t(lang, 'schedule_title')}
            </h2>
          </motion.div>
          <div className="space-y-3">
            {schedule.length === 0 && (
              <div className="text-gray-500 text-sm text-center py-8">No upcoming shows scheduled yet.</div>
            )}
            {schedule.map((session, idx) => (
              <motion.div key={session.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5, delay: idx * 0.05 }}>
                <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
                  <div className="text-center min-w-[70px]">
                    <div className="text-[#F5C200] font-black text-sm">
                      {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {new Date(session.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                  </div>
                  <div className="w-px h-10 bg-white/10" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#F5C200]/20 text-[#F5C200]">
                        {session.time_slot === 'morning' ? t(lang, 'schedule_morning') : t(lang, 'schedule_evening')}
                      </span>
                    </div>
                    <p className="text-white font-semibold text-sm">{session.topic}</p>
                    {session.description && <p className="text-gray-500 text-xs mt-0.5">{session.description}</p>}
                  </div>
                  <button
                    onClick={() => requireVerification('callin')}
                    className="hidden md:flex items-center gap-2 text-xs font-bold text-[#F5C200] border border-[#F5C200]/30 px-3 py-2 rounded-xl hover:bg-[#F5C200]/10 transition-colors"
                  >
                    <Phone size={12} /> {t(lang, 'nav_callin')}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SONG REQUEST */}
      <section id="song" className="py-16 bg-[#1a1a1a]">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6 }}>
            <div className="w-16 h-16 bg-[#F5C200]/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Music className="text-[#F5C200]" size={32} />
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">{t(lang, 'song_title')}</h2>
            <p className="text-gray-400 mb-8">{t(lang, 'song_subtitle')}</p>
            <button
              onClick={() => setModal('song')}
              className="inline-flex items-center gap-2 bg-[#F5C200] text-[#2D2D2D] font-black px-8 py-4 rounded-2xl hover:bg-yellow-400 transition-all hover:scale-105 text-base shadow-lg shadow-[#F5C200]/20"
            >
              <Music size={20} /> {t(lang, 'song_btn')}
            </button>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#1a1a1a] border-t border-white/10 py-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#F5C200] rounded-full flex items-center justify-center">
              <Radio size={18} className="text-[#2D2D2D]" />
            </div>
            <div>
              <div className="font-black text-white">KCXU 92.7 FM</div>
              <div className="text-[#F5C200] text-xs">{t(lang, 'footer_tagline')}</div>
            </div>
          </div>
          <div className="text-center text-gray-500 text-sm">
            <p>{t(lang, 'footer_address')}</p>
            <p className="mt-1">contact@kcxu.org · 1.408.634.8086</p>
          </div>
          <Link to="/admin" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">Admin</Link>
        </div>
      </footer>

      {/* MOBILE BOTTOM NAV */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#2D2D2D] border-t border-white/10 flex">
        {[
          { icon: Phone, label: t(lang, 'nav_callin'), action: () => requireVerification('callin') },
          { icon: ChevronUp, label: t(lang, 'nav_issues'), action: () => document.getElementById('issues')?.scrollIntoView({ behavior: 'smooth' }) },
          { icon: Calendar, label: t(lang, 'nav_schedule'), action: () => document.getElementById('schedule')?.scrollIntoView({ behavior: 'smooth' }) },
          { icon: Music, label: t(lang, 'nav_song'), action: () => setModal('song') },
        ].map(({ icon: Icon, label, action }) => (
          <button key={label} onClick={action} className="flex-1 flex flex-col items-center gap-1 py-3 text-gray-400 hover:text-[#F5C200] transition-colors">
            <Icon size={20} />
            <span className="text-[10px] font-semibold">{label}</span>
          </button>
        ))}
      </div>
      <div className="h-16 md:hidden" />

      {/* MODALS */}
      {modal === 'residency' && (
        <ResidencyModal lang={lang} onVerified={handleVerified} onClose={() => setModal(null)} />
      )}
      {modal === 'callin' && (
        <CallInModal lang={lang} verification={verification} onClose={() => setModal(null)} />
      )}
      {modal === 'issue' && (
        <IssueSubmitModal lang={lang} verification={verification} onClose={() => { setModal(null); loadData(); }} />
      )}
      {modal === 'song' && (
        <SongRequestModal lang={lang} onClose={() => setModal(null)} />
      )}
    </div>
  );
}