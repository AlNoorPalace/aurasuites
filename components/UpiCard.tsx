import { useEffect, useMemo, useState } from 'react';
import { Smartphone } from 'lucide-react';
import { buildUpiLink, upiConfig } from '../lib/upi';

/** Optional pay-now card. Hidden unless a valid UPI id is configured. */
export default function UpiCard({ reference, total }: { reference: string; total: number }) {
  const { id, name } = upiConfig();
  const link = useMemo(() => buildUpiLink({ id, name, amount: total, reference }), [id, name, total, reference]);
  const [qr, setQr] = useState('');
  useEffect(() => {
    if (!link) return;
    let live = true;
    import('qrcode').then((q) => q.toDataURL(link, { errorCorrectionLevel: 'H', margin: 2, width: 240 })).then((u) => live && setQr(u)).catch(() => {});
    return () => { live = false; };
  }, [link]);
  if (!link) return null;
  return (
    <div className="mt-6 border border-gold/40 bg-ivory p-5 text-center" data-testid="upi-card">
      <h3 className="text-xl">Prefer to pay now?</h3>
      <p className="mt-1 text-sm text-ink/70">Optional. You can also simply pay at the hotel.</p>
      {qr && <img src={qr} alt="UPI payment QR code" className="mx-auto mt-4 h-52 w-52" />}
      <a href={link} className="btn btn-dark mt-4 md:hidden"><Smartphone size={14} /> Pay with a UPI app</a>
      <p className="mt-4 text-xs text-ink/60">Paying here is optional. This website cannot verify the payment; the hotel matches it to your booking using the reference <b>{reference}</b>, so please keep it in the payment note.</p>
    </div>
  );
}
