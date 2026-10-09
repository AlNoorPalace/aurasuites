import { useState } from 'react';
import { api, friendly } from '../lib/client';
import { CONTACT } from '../data/hotels';

/** Shown instead of the booking engine when the database is unavailable. */
export default function RequestForm({ hotel }: { hotel: string }) {
  const [f, setF] = useState({ name: '', phone: '', email: '', check_in: '', check_out: '', guests: '2', message: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [msg, setMsg] = useState('');
  const set = (k: string) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending'); setErrs({});
    const r = await api('/api/send-booking', { method: 'POST', body: { ...f, hotel } });
    if (r.ok) return setState('sent');
    if (r.fields) setErrs(r.fields);
    setMsg(r.error === 'email_not_configured' ? `Online requests are not available right now. Please email ${CONTACT.email} or call ${CONTACT.phoneDisplay}.` : friendly(r));
    setState('failed');
  };
  if (state === 'sent') return <p className="border border-gold/40 bg-ivory p-5">Thank you. We have your request and will get back to you shortly.</p>;
  const field = (k: keyof typeof f, label: string, type = 'text') => (
    <div><label className="label" htmlFor={`rq-${k}`}>{label}</label><input id={`rq-${k}`} className="input" type={type} value={f[k]} onChange={set(k)} />{errs[k] && <p className="err">{errs[k]}</p>}</div>
  );
  return (
    <form onSubmit={submit} className="grid gap-3 border border-gold/40 bg-ivory p-5 md:grid-cols-2" data-testid="request-form">
      <p className="md:col-span-2 text-sm">Online booking is not available right now. Send us your request and we will confirm your stay by phone or email.</p>
      {field('name', 'Your name')}{field('phone', 'Phone', 'tel')}{field('email', 'Email', 'email')}{field('guests', 'Guests', 'number')}
      {field('check_in', 'Check-in', 'date')}{field('check_out', 'Check-out', 'date')}
      <div className="md:col-span-2"><label className="label" htmlFor="rq-message">Anything we should know?</label><textarea id="rq-message" className="input" rows={3} value={f.message} onChange={set('message')} /></div>
      {state === 'failed' && <p className="err md:col-span-2">{msg}</p>}
      <button className="btn md:col-span-2" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send request'}</button>
    </form>
  );
}
