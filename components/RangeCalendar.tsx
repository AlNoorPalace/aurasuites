import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { iso, parseIso, today } from '../lib/client';

/** One calendar for both dates: click check-in, then check-out. */
export default function RangeCalendar({ checkIn, checkOut, onChange, single }: { checkIn: string; checkOut: string; onChange: (a: string, b: string) => void; single?: boolean }) {
  const t = today();
  const base = checkIn ? parseIso(checkIn) : new Date();
  const [month, setMonth] = useState(new Date(base.getFullYear(), base.getMonth(), 1));

  const pick = (d: string) => {
    if (!checkIn || (checkIn && checkOut) || d <= checkIn) onChange(d, '');
    else onChange(checkIn, d);
  };

  const render = (m: Date) => {
    const first = new Date(m.getFullYear(), m.getMonth(), 1);
    const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const cells = [...Array(first.getDay()).fill(null), ...Array.from({ length: days }, (_, i) => iso(new Date(m.getFullYear(), m.getMonth(), i + 1)))];
    return (
      <div className="w-64">
        <p className="mb-2 text-center font-serif text-lg">{m.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
        <div className="grid grid-cols-7 text-center text-xs text-ink/50">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="py-1">{d}</span>)}</div>
        <div className="grid grid-cols-7 text-center text-sm">
          {cells.map((d, i) => {
            if (!d) return <span key={i} />;
            const past = d < t;
            const edge = d === checkIn || d === checkOut;
            const inside = checkIn && checkOut && d > checkIn && d < checkOut;
            return (
              <button key={d} type="button" disabled={past} onClick={() => pick(d)} data-date={d}
                className={`m-px aspect-square rounded-sm ${past ? 'text-ink/25' : 'hover:bg-gold/20'} ${edge ? '!bg-ink !text-gold-light' : ''} ${inside ? 'bg-gold/20' : ''}`}>
                {Number(d.slice(8))}
              </button>
            );
          })}
        </div>
      </div>
    );
  };
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  return (
    <div className="relative">
      <div className="mb-1 flex justify-between">
        <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={18} /></button>
        <button type="button" aria-label="Next month" onClick={() => setMonth(next)}><ChevronRight size={18} /></button>
      </div>
      <div className="flex flex-wrap justify-center gap-6">{render(month)}{!single && <div className="hidden md:block">{render(next)}</div>}</div>
      <p className="mt-2 text-center text-xs text-ink/60">{!checkIn ? 'Choose check-in' : !checkOut ? 'Now choose check-out' : 'Dates selected'}</p>
    </div>
  );
}
