import { Phone } from 'lucide-react';

function nextWeekday(targetDay, weekOffset = 0) {
  const d = new Date();
  const diff = (targetDay - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff + weekOffset * 7);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function CallInSchedule({ weekOffset = 0 }) {
  const monday = nextWeekday(1, weekOffset);
  const friday = nextWeekday(5, weekOffset);
  return (
    <a href="tel:+14085061772" className="block mt-4 bg-[#D32F2F]/10 border border-[#D32F2F]/40 rounded-xl px-4 py-3 hover:bg-[#D32F2F]/20 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <Phone size={14} className="text-[#D32F2F]" />
        <span className="text-[#D32F2F] text-xs font-black uppercase tracking-wider">Live Call-In — 408.506.1772</span>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-white font-bold">{monday}</span>
          <span className="text-gray-300">9–10 AM &amp; 6–7 PM PT</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-white font-bold">{friday}</span>
          <span className="text-gray-300">9–10 AM &amp; 6–7 PM PT</span>
        </div>
      </div>
    </a>
  );
}