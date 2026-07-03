import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Radio, Users, Music, BarChart2, Calendar, Mic, FileText, Settings, LogOut, Play, ArrowUp, VolumeX, Trash2, RefreshCw, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

const TABS = [
  { id: 'queue', label: 'Live Queue', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'issues', label: 'Community Issues', icon: ChevronUp },
  { id: 'schedule', label: 'Show Schedule', icon: Calendar },
  { id: 'songs', label: 'Song Requests', icon: Music },
  { id: 'recordings', label: 'Recordings', icon: Mic },
  { id: 'research', label: 'Weekly Research', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState('queue');
  const [queue, setQueue] = useState([]);
  const [issues, setIssues] = useState([]);
  const [songs, setSongs] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [queuePaused, setQueuePaused] = useState(false);
  const [maxQueue, setMaxQueue] = useState(20);
  const [researchRunning, setResearchRunning] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ date: '', time_slot: 'morning', topic: '', description: '' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [q, iss, s, sched, rec, rep] = await Promise.all([
        base44.entities.CallerQueue.filter({ status: 'queued' }, 'queue_position'),
        base44.entities.CommunityIssue.list('-created_date', 100),
        base44.entities.SongRequest.list('-created_date', 100),
        base44.entities.ShowSchedule.list('date', 50),
        base44.entities.BroadcastRecording.list('-created_date', 50),
        base44.entities.WeeklyResearchReport.list('-created_date', 10),
      ]);
      setQueue(q); setIssues(iss); setSongs(s); setSchedule(sched); setRecordings(rec); setReports(rep);
    } catch (e) { console.error(e); }
  };

  const bringLive = async (caller) => {
    await base44.entities.CallerQueue.update(caller.id, { status: 'live' });
    loadAll();
  };

  const bumpToFront = async (caller) => {
    await base44.entities.CallerQueue.update(caller.id, { queue_position: 0 });
    loadAll();
  };

  const blockCaller = async (caller) => {
    await base44.entities.CallerQueue.update(caller.id, { status: 'blocked' });
    loadAll();
  };

  const muteCaller = async (caller) => {
    await base44.entities.CallerQueue.update(caller.id, { status: 'muted' });
    loadAll();
  };

  const removeCaller = async (caller) => {
    await base44.entities.CallerQueue.delete(caller.id);
    loadAll();
  };

  const approveIssue = async (issue) => {
    await base44.entities.CommunityIssue.update(issue.id, { status: 'approved' });
    loadAll();
  };

  const rejectIssue = async (issue) => {
    await base44.entities.CommunityIssue.update(issue.id, { status: 'rejected' });
    loadAll();
  };

  const pinIssue = async (issue, rank) => {
    await base44.entities.CommunityIssue.update(issue.id, { is_pinned: !issue.is_pinned, pin_rank: rank });
    loadAll();
  };

  const runWeeklyResearch = async () => {
    setResearchRunning(true);
    try {
      const res = await base44.functions.invoke('weeklyResearch', {});
      await loadAll();
    } catch (e) { console.error(e); }
    setResearchRunning(false);
  };

  const addSchedule = async (e) => {
    e.preventDefault();
    await base44.entities.ShowSchedule.create({ ...scheduleForm, is_active: true });
    setScheduleForm({ date: '', time_slot: 'morning', topic: '', description: '' });
    loadAll();
  };

  const statusBadge = (status) => {
    const map = {
      queued: 'bg-white/10 text-white',
      live: 'bg-[#F5C200] text-[#2D2D2D]',
      blocked: 'bg-red-500 text-white',
      muted: 'bg-gray-600 text-gray-300',
    };
    return map[status] || 'bg-gray-700 text-gray-400';
  };

  const langMap = { en: 'English', es: 'Español', vi: 'Tiếng Việt', zh: '中文', tl: 'Tagalog' };

  // Analytics data
  const songTrends = songs.reduce((acc, s) => {
    const key = `${s.artist} - ${s.song_title}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topSongs = Object.entries(songTrends).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));

  const approvedIssues = issues.filter(i => i.status === 'approved').sort((a, b) => b.vote_count - a.vote_count).slice(0, 8);

  const weeklyData = (() => {
    const weeks = {};
    issues.forEach(i => {
      const d = new Date(i.created_date);
      const week = `${d.getMonth() + 1}/${d.getDate()}`;
      weeks[week] = (weeks[week] || 0) + 1;
    });
    return Object.entries(weeks).slice(-8).map(([week, count]) => ({ week, count }));
  })();

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex">
      {/* SIDEBAR */}
      <aside className="w-56 bg-[#2D2D2D] flex flex-col fixed h-full z-30">
        <div className="px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#F5C200] rounded-full flex items-center justify-center">
              <Radio size={14} className="text-[#2D2D2D]" />
            </div>
            <div>
              <div className="text-white font-black text-xs">KCXU 92.7</div>
              <div className="text-gray-500 text-[9px]">Admin Dashboard</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all ${tab === id ? 'bg-[#F5C200]/15 text-[#F5C200] border-r-2 border-[#F5C200]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-white/10">
          <button onClick={() => base44.auth.logout('/')} className="flex items-center gap-2 text-gray-500 hover:text-white text-sm transition-colors">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="ml-56 flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white font-black text-2xl">{TABS.find(t => t.id === tab)?.label}</h1>
          <button onClick={loadAll} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* QUEUE TAB */}
        {tab === 'queue' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-[#2D2D2D] rounded-2xl">
              <button
                onClick={() => setQueuePaused(!queuePaused)}
                className={`px-4 py-2 rounded-xl font-bold text-sm ${queuePaused ? 'bg-[#F5C200] text-[#2D2D2D]' : 'bg-white/10 text-white'}`}
              >
                {queuePaused ? '▶ Resume Queue' : '⏸ Pause Queue'}
              </button>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">Max Queue:</span>
                <input
                  type="number"
                  value={maxQueue}
                  onChange={e => setMaxQueue(e.target.value)}
                  className="w-16 bg-white/10 text-white rounded-lg px-2 py-1 text-sm text-center"
                />
              </div>
              <button
                onClick={async () => { await base44.entities.CallerQueue.updateMany({ status: 'queued' }, { $set: { status: 'completed' } }); loadAll(); }}
                className="px-4 py-2 rounded-xl font-bold text-sm bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
              >
                Clear Queue
              </button>
              <div className="ml-auto text-sm text-gray-400">{queue.length} callers waiting</div>
            </div>
            {queue.length === 0 && <div className="text-gray-500 text-center py-12">No callers in queue</div>}
            {queue.map((caller, idx) => (
              <div key={caller.id} className="bg-[#2D2D2D] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-[#F5C200]/20 rounded-full flex items-center justify-center text-[#F5C200] font-black">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold">{caller.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${statusBadge(caller.status)}`}>{caller.status}</span>
                    <span className="text-xs text-gray-500">{langMap[caller.language] || caller.language}</span>
                    <span className="text-xs text-gray-500">{caller.connection_type}</span>
                  </div>
                  <div className="text-gray-400 text-sm">{caller.phone}</div>
                  {caller.song_request_title && (
                    <div className="text-[#F5C200] text-xs mt-1">🎵 {caller.song_request_title} — {caller.song_request_artist}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => bringLive(caller)} className="flex items-center gap-1 px-3 py-1.5 bg-[#F5C200] text-[#2D2D2D] rounded-xl font-bold text-xs hover:bg-yellow-400 transition-colors">
                    <Play size={12} /> Bring Live
                  </button>
                  <button onClick={() => bumpToFront(caller)} title="Bump to Front" className="p-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors">
                    <ArrowUp size={14} />
                  </button>
                  <button onClick={() => muteCaller(caller)} title="Mute" className="p-2 bg-white/10 text-gray-400 rounded-xl hover:bg-white/20 transition-colors">
                    <VolumeX size={14} />
                  </button>
                  <button onClick={() => removeCaller(caller)} title="Remove" className="p-2 bg-red-600/20 text-red-400 rounded-xl hover:bg-red-600/30 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {tab === 'analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total Callers', value: queue.length },
                { label: 'Song Requests', value: songs.length },
                { label: 'Community Issues', value: issues.filter(i => i.status === 'approved').length },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#2D2D2D] rounded-2xl p-5">
                  <div className="text-3xl font-black text-[#F5C200]">{value}</div>
                  <div className="text-gray-400 text-sm mt-1">{label}</div>
                </div>
              ))}
            </div>
            <div className="bg-[#2D2D2D] rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4">Top Song Requests</h3>
              {topSongs.length === 0 ? <div className="text-gray-500 text-sm">No requests yet</div> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topSongs}>
                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#2D2D2D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'white' }} />
                    <Bar dataKey="count" fill="#F5C200" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="bg-[#2D2D2D] rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4">Top Voted Community Issues</h3>
              {approvedIssues.length === 0 ? <div className="text-gray-500 text-sm">No approved issues yet</div> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={approvedIssues.map(i => ({ name: i.title.slice(0, 20), votes: i.vote_count || 0 }))}>
                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#2D2D2D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'white' }} />
                    <Bar dataKey="votes" fill="#F5C200" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="bg-[#2D2D2D] rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4">Issue Submission Trends</h3>
              {weeklyData.length === 0 ? <div className="text-gray-500 text-sm">No data yet</div> : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="week" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#2D2D2D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'white' }} />
                    <Line type="monotone" dataKey="count" stroke="#F5C200" strokeWidth={2} dot={{ fill: '#F5C200', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* ISSUES TAB */}
        {tab === 'issues' && (
          <div className="space-y-3">
            {['pending', 'approved', 'rejected'].map(status => (
              <div key={status}>
                <h3 className="text-[#F5C200] font-bold uppercase tracking-wider text-xs mb-3 mt-6 first:mt-0">{status}</h3>
                {issues.filter(i => i.status === status).length === 0 && (
                  <div className="text-gray-600 text-sm py-3">None</div>
                )}
                {issues.filter(i => i.status === status).map(issue => (
                  <div key={issue.id} className="bg-[#2D2D2D] border border-white/10 rounded-2xl p-4 mb-2 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-white font-bold text-sm">{issue.title}</span>
                        {issue.is_pinned && <span className="text-xs bg-[#F5C200] text-[#2D2D2D] px-2 py-0.5 rounded-full font-bold">Pinned #{issue.pin_rank}</span>}
                        <span className="text-xs text-[#F5C200]">▲ {issue.vote_count || 0}</span>
                      </div>
                      <p className="text-gray-400 text-sm line-clamp-2">{issue.description}</p>
                      <p className="text-gray-600 text-xs mt-1">By {issue.submitter_name} · {issue.submitter_phone}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 flex-wrap">
                      {status === 'pending' && (
                        <>
                          <button onClick={() => approveIssue(issue)} className="px-3 py-1.5 bg-[#F5C200] text-[#2D2D2D] rounded-xl font-bold text-xs hover:bg-yellow-400">Approve</button>
                          <button onClick={() => rejectIssue(issue)} className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded-xl font-bold text-xs hover:bg-red-600/30">Reject</button>
                        </>
                      )}
                      {status === 'approved' && (
                        <button onClick={() => pinIssue(issue, issue.is_pinned ? null : (issues.filter(i => i.is_pinned).length + 1))} className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${issue.is_pinned ? 'bg-[#F5C200] text-[#2D2D2D]' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                          {issue.is_pinned ? 'Unpin' : 'Pin to Top 3'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* SCHEDULE TAB */}
        {tab === 'schedule' && (
          <div className="space-y-6">
            <form onSubmit={addSchedule} className="bg-[#2D2D2D] rounded-2xl p-6 space-y-4">
              <h3 className="text-white font-bold mb-2">Add New Session</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Date</label>
                  <input type="date" value={scheduleForm.date} onChange={e => setScheduleForm(f => ({ ...f, date: e.target.value }))} required className="w-full bg-white/10 text-white rounded-xl px-4 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Time Slot</label>
                  <select value={scheduleForm.time_slot} onChange={e => setScheduleForm(f => ({ ...f, time_slot: e.target.value }))} className="w-full bg-white/10 text-white rounded-xl px-4 py-2 text-sm">
                    <option value="morning">9:00 – 10:00 AM</option>
                    <option value="evening">5:00 – 6:00 PM</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Topic</label>
                <input value={scheduleForm.topic} onChange={e => setScheduleForm(f => ({ ...f, topic: e.target.value }))} required className="w-full bg-white/10 text-white rounded-xl px-4 py-2 text-sm" placeholder="Show topic..." />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Description (optional)</label>
                <input value={scheduleForm.description} onChange={e => setScheduleForm(f => ({ ...f, description: e.target.value }))} className="w-full bg-white/10 text-white rounded-xl px-4 py-2 text-sm" placeholder="Brief description..." />
              </div>
              <button type="submit" className="bg-[#F5C200] text-[#2D2D2D] font-bold px-6 py-2 rounded-xl hover:bg-yellow-400 transition-colors">Add Session</button>
            </form>
            <div className="space-y-2">
              {schedule.map(session => (
                <div key={session.id} className="bg-[#2D2D2D] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                  <div className="text-[#F5C200] font-bold text-sm min-w-[80px]">
                    {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-xs bg-[#F5C200]/20 text-[#F5C200] px-2 py-1 rounded-lg min-w-[80px] text-center">
                    {session.time_slot === 'morning' ? '9–10 AM' : '5–6 PM'}
                  </div>
                  <div className="flex-1">
                    <span className="text-white font-semibold text-sm">{session.topic}</span>
                    {session.description && <span className="text-gray-500 text-xs ml-2">— {session.description}</span>}
                  </div>
                  <button onClick={async () => { await base44.entities.ShowSchedule.delete(session.id); loadAll(); }} className="text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SONGS TAB */}
        {tab === 'songs' && (
          <div className="space-y-2">
            {songs.length === 0 && <div className="text-gray-500 text-center py-12">No song requests yet</div>}
            {songs.map(song => (
              <div key={song.id} className="bg-[#2D2D2D] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-[#F5C200]/20 rounded-full flex items-center justify-center">
                  <Music size={16} className="text-[#F5C200]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold text-sm">{song.song_title}</div>
                  <div className="text-gray-400 text-xs">{song.artist}</div>
                </div>
                <div className="text-right">
                  <div className="text-gray-400 text-sm">{song.name}</div>
                  <div className="text-gray-600 text-xs">{song.phone}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-bold ${song.status === 'played' ? 'bg-[#F5C200] text-[#2D2D2D]' : 'bg-white/10 text-gray-400'}`}>{song.status}</span>
                <div className="flex gap-2">
                  <button onClick={async () => { await base44.entities.SongRequest.update(song.id, { status: 'played' }); loadAll(); }} className="text-xs px-2 py-1 bg-[#F5C200]/20 text-[#F5C200] rounded-lg hover:bg-[#F5C200]/30">Played</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RECORDINGS TAB */}
        {tab === 'recordings' && (
          <div className="space-y-3">
            <div className="bg-[#2D2D2D] border border-white/10 rounded-2xl p-4 text-sm text-gray-400 mb-4">
              <p className="text-[#F5C200] font-semibold mb-1">Google Drive Auto-Recording</p>
              <p>Recordings are captured server-side from the radio.co stream and saved to the designated Google Drive folder. Connect Google Drive in Settings to enable auto-save.</p>
            </div>
            {recordings.length === 0 && <div className="text-gray-500 text-center py-12">No recordings yet</div>}
            {recordings.map(rec => (
              <div key={rec.id} className="bg-[#2D2D2D] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-[#F5C200]/20 rounded-full flex items-center justify-center">
                  <Mic size={16} className="text-[#F5C200]" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold text-sm">{rec.title}</div>
                  <div className="text-gray-400 text-xs">{rec.date} · {rec.time_slot} · {rec.duration_minutes}min</div>
                </div>
                {rec.drive_file_url && (
                  <a href={rec.drive_file_url} target="_blank" rel="noreferrer" className="text-[#F5C200] text-sm hover:underline">Open in Drive →</a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* RESEARCH TAB */}
        {tab === 'research' && (
          <div className="space-y-6">
            <button
              onClick={runWeeklyResearch}
              disabled={researchRunning}
              className="flex items-center gap-2 bg-[#F5C200] text-[#2D2D2D] font-bold px-6 py-3 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={researchRunning ? 'animate-spin' : ''} />
              {researchRunning ? 'Generating Research...' : 'Generate & Email Weekly Research Now'}
            </button>
            {reports.map(report => (
              <div key={report.id} className="bg-[#2D2D2D] border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-white font-bold">Report — {report.generated_date}</div>
                    <div className="text-gray-500 text-xs mt-0.5">
                      {report.email_sent ? `✓ Emailed ${report.email_sent_at || ''}` : 'Not emailed yet'}
                      {report.seeded_to_issues ? ' · Seeded to issues' : ''}
                    </div>
                  </div>
                </div>
                <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{report.content}</div>
              </div>
            ))}
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-[#2D2D2D] rounded-2xl p-6 space-y-4">
              <h3 className="text-white font-bold">Integration Keys</h3>
              {[
                { label: 'HeyGen API Key', placeholder: 'heygen_...', desc: 'Required to activate the live avatar chatbot mode' },
                { label: 'Twilio Account SID', placeholder: 'AC...', desc: 'For phone bridge and WebRTC call-in' },
                { label: 'Twilio Auth Token', placeholder: 'auth_...', desc: 'Twilio authentication token' },
                { label: 'Radio.co Player URL', placeholder: 'https://player.radio.co/p/...', desc: 'Your radio.co station player embed URL' },
                { label: 'Google Drive Folder ID', placeholder: 'Drive folder ID for recordings', desc: 'Folder where broadcast recordings are saved' },
              ].map(({ label, placeholder, desc }) => (
                <div key={label}>
                  <label className="text-gray-300 text-sm font-semibold block mb-1">{label}</label>
                  <p className="text-gray-500 text-xs mb-2">{desc}</p>
                  <input type="text" placeholder={placeholder} className="w-full bg-white/10 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C200]" />
                </div>
              ))}
              <button className="bg-[#F5C200] text-[#2D2D2D] font-bold px-6 py-2 rounded-xl hover:bg-yellow-400 transition-colors">Save Settings</button>
            </div>
            <div className="bg-[#2D2D2D] rounded-2xl p-6 space-y-3">
              <h3 className="text-white font-bold">Call-In Hours</h3>
              <p className="text-gray-400 text-sm">Live call-in is available 9–10 AM and 5–6 PM daily.</p>
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm">Call-in enabled:</span>
                <button className="w-12 h-6 bg-[#F5C200] rounded-full relative">
                  <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}