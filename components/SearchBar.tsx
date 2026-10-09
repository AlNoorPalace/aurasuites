import { useRouter } from 'next/router';
import { useState } from 'react';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import { useSearch } from './SearchContext';
import RangeCalendar from './RangeCalendar';
import Stepper from './Stepper';
import { prettyDate } from '../lib/client';

/** hotels: id/name list for the destination dropdown. onSearch overrides navigation (used on hotel pages). */
export default function SearchBar({ hotels, onSearch, lockHotel, compact }: { hotels: { slug: string; name: string }[]; onSearch?: () => void; lockHotel?: boolean; compact?: boolean }) {
  const s = useSearch();
  const router = useRouter();
  const [panel, setPanel] = useState<'' | 'dates' | 'guests'>('');
  const go = () => {
    if (!s.checkIn || !s.checkOut) { setPanel('dates'); return; }
    if (onSearch) return onSearch();
    router.push(s.hotel ? `/hotels/${s.hotel}#rooms` : '/hotels');
  };
  const guests = `${s.adults + s.children} guest${s.adults + s.children > 1 ? 's' : ''}, ${s.rooms} room${s.rooms > 1 ? 's' : ''}`;
  return (
    <div className="relative border border-gold/40 bg-white p-3 text-ink shadow-xl">
      <div className={`grid gap-2 ${compact ? '' : 'md:grid-cols-[1.2fr_1.4fr_1.1fr_auto]'}`}>
        <label className="flex items-center gap-2 border border-ink/15 px-3 py-2">
          <MapPin size={16} className="text-gold-dark" />
          <select aria-label="Destination" disabled={lockHotel} value={s.hotel} onChange={(e) => s.set({ hotel: e.target.value })} className="w-full bg-transparent text-sm outline-none">
            <option value="">All locations</option>
            {hotels.map((h) => <option key={h.slug} value={h.slug}>{h.name}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => setPanel(panel === 'dates' ? '' : 'dates')} className="flex items-center gap-2 border border-ink/15 px-3 py-2 text-left text-sm" aria-label="Choose dates">
          <CalendarDays size={16} className="text-gold-dark" />
          <span>{s.checkIn ? prettyDate(s.checkIn) : 'Check-in'} → {s.checkOut ? prettyDate(s.checkOut) : 'Check-out'}</span>
        </button>
        <button type="button" onClick={() => setPanel(panel === 'guests' ? '' : 'guests')} className="flex items-center gap-2 border border-ink/15 px-3 py-2 text-left text-sm" aria-label="Guests and rooms">
          <Users size={16} className="text-gold-dark" /> {guests}
        </button>
        <button type="button" onClick={go} className="btn">Check availability</button>
      </div>
      {panel === 'dates' && (
        <div className={`absolute left-0 right-0 top-full z-30 mt-2 border border-gold/40 bg-white p-4 shadow-xl ${compact ? '' : 'md:left-auto md:right-auto md:w-[36rem]'}`}>
          <RangeCalendar single={compact} checkIn={s.checkIn} checkOut={s.checkOut} onChange={(a, b) => { s.set({ checkIn: a, checkOut: b }); if (b) setPanel(''); }} />
        </div>
      )}
      {panel === 'guests' && (
        <div className={`absolute right-0 top-full z-30 mt-2 w-full border border-gold/40 bg-white p-4 shadow-xl ${compact ? '' : 'md:w-72'}`}>
          <Stepper label="Adults" value={s.adults} min={1} max={12} onChange={(n) => s.set({ adults: n })} />
          <Stepper label="Children" value={s.children} min={0} max={8} onChange={(n) => s.set({ children: n })} />
          <Stepper label="Rooms" value={s.rooms} min={1} max={6} onChange={(n) => s.set({ rooms: n })} />
          <button type="button" className="btn mt-3 w-full" onClick={() => setPanel('')}>Done</button>
        </div>
      )}
    </div>
  );
}
