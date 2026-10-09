import { Minus, Plus } from 'lucide-react';

export default function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-3">
        <button type="button" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="rounded-full border border-ink/30 p-1 disabled:opacity-30"><Minus size={14} /></button>
        <span className="w-5 text-center" data-testid={`val-${label}`}>{value}</span>
        <button type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="rounded-full border border-ink/30 p-1 disabled:opacity-30"><Plus size={14} /></button>
      </span>
    </div>
  );
}
