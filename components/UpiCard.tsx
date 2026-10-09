import { useEffect, useMemo, useState } from 'react';
import { Smartphone } from 'lucide-react';
import { advanceBounds, buildUpiLink, upiConfig, validAdvance } from '../lib/upi';
import { rupees } from '../lib/client';

/** Advance payment: the guest chooses an amount (min ₹500) and a QR is made for exactly that amount. Hidden unless a UPI id is set. */
export default function UpiCard({ reference, total, paid = 0 }: { reference: string; total: number; paid?: number }) {
  const { id, name } = upiConfig();
  const balance = Math.max(0, total - paid);
  const { min, max } = advanceBounds(balance);
  const [text, setText] = useState(String(min));
  const [qr, setQr] = useState('');
  useEffect(() => { setText(String(min)); }, [min]);

  const amount = /^\d+$/.test(text.trim()) ? Number(text) : NaN;
  const ok = validAdvance(amount, balance);
  const link = useMemo(() => (ok ? buildUpiLink({ id, name, amount, reference }) : null), [ok, id, name, amount, reference]);

  useEffect(() => {
    if (!link) { setQr(''); return; }
    let live = true;
    import('qrcode').then((q) => q.toDataURL(link, { errorCorrectionLevel: 'H', margin: 2, width: 240 })).then((u) => live && setQr(u)).catch(() => {});
    return () => { live = false; };
  }, [link]);

  if (!id || balance <= 0) return null;
  const chips = Array.from(new Set([min, Math.round(balance / 2 / 100) * 100, balance].filter((n) => n >= min && n <= max)));
  const error = text.trim() === '' ? '' : !ok ? (Number.isNaN(amount) ? 'Enter a whole number of rupees.' : amount < min ? `The minimum advance is ${rupees(min)}.` : `The most you can pay is ${rupees(max)}.`) : '';

  return (
    <div className="mt-6 border border-gold/40 bg-ivory p-5 text-center" data-testid="upi-card">
      <h3 className="text-xl">Pay an advance to secure your slot</h3>
      <p className="mt-1 text-sm text-ink/70">Choose how much to pay now (minimum {rupees(min)}). The rest is paid at the hotel.</p>
      {paid > 0 && <p className="mt-1 text-xs text-ink/60">Already received: {rupees(paid)} · balance {rupees(balance)}</p>}
      <div className="mx-auto mt-4 max-w-xs">
        <label className="label" htmlFor="advance">Amount (₹)</label>
        <input id="advance" className="input text-center text-lg" inputMode="numeric" value={text} onChange={(e) => setText(e.target.value)} aria-describedby="advance-err" />
        <p id="advance-err" className="err min-h-[1.25rem]">{error}</p>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {chips.map((c) => <button key={c} type="button" onClick={() => setText(String(c))} className={`border px-3 py-1 text-xs ${amount === c ? 'border-ink bg-ink text-white' : 'border-ink/20'}`}>{c === balance ? `Full ${rupees(c)}` : rupees(c)}</button>)}
        </div>
      </div>
      {ok && qr ? (
        <>
          <img src={qr} alt={`UPI payment QR code for ${rupees(amount)}`} className="mx-auto mt-4 h-52 w-52" data-testid="upi-qr" />
          <p className="mt-1 text-sm">Scan to pay <b data-testid="upi-amount">{rupees(amount)}</b></p>
          <a href={link!} className="btn btn-dark mt-3 md:hidden"><Smartphone size={14} /> Pay {rupees(amount)} with a UPI app</a>
        </>
      ) : <p className="mt-4 text-sm text-ink/50">Enter an amount to see your QR code.</p>}
      <p className="mt-4 text-xs text-ink/60">Paying here is optional. This website cannot verify the payment; the hotel matches it to your booking using the reference <b>{reference}</b>, so please keep it in the payment note.</p>
    </div>
  );
}
