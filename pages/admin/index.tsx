import type { GetStaticProps } from 'next';
import Head from 'next/head';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { api, friendly } from '../../lib/client';
import Bookings from '../../components/admin/Bookings';
import Hotels, { type AdminHotel } from '../../components/admin/Hotels';
import Rooms from '../../components/admin/Rooms';
import Availability from '../../components/admin/Availability';
import { adm } from '../../components/admin/common';

export const getStaticProps: GetStaticProps = async () => {
  let bundled: string[] = [];
  try { bundled = readdirSync(join(process.cwd(), 'public', 'img')).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).map((f) => `/img/${f}`); } catch {}
  return { props: { bundled } };
};

const TABS = ['Bookings', 'Hotels', 'Rooms & rates', 'Availability'] as const;

export default function Admin({ bundled }: { bundled: string[] }) {
  const [auth, setAuth] = useState<'loading' | 'out' | 'in'>('loading');
  const [info, setInfo] = useState({ configured: true, database: true });
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [tab, setTab] = useState<(typeof TABS)[number]>('Bookings');
  const [hotels, setHotels] = useState<AdminHotel[]>([]);

  const ctx = useMemo(() => ({ bundled, onUnauthorized: () => setAuth('out') }), [bundled]);
  useEffect(() => { api<{ authenticated: boolean; configured: boolean; database: boolean }>('/api/admin/session').then((r) => { if (r.ok) { setInfo(r.data); setAuth(r.data.authenticated ? 'in' : 'out'); } else setAuth('out'); }); }, []);
  const loadHotels = useCallback(async () => { const r = await adm<{ hotels: AdminHotel[] }>(ctx, '/api/admin/hotels'); if (r.data) setHotels(r.data.hotels); }, [ctx]);
  useEffect(() => { if (auth === 'in') loadHotels(); }, [auth, loadHotels]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    const r = await api('/api/admin/login', { method: 'POST', body: { password: pw } });
    if (r.ok) { setPw(''); setAuth('in'); } else setErr(r.error === 'wrong_password' ? 'Wrong password.' : r.error === 'admin_not_configured' ? 'Admin is not configured: set ADMIN_PASSWORD and ADMIN_SESSION_SECRET.' : friendly(r));
  };
  const logout = async () => { await api('/api/admin/logout', { method: 'POST', body: {} }); setAuth('out'); };

  return (
    <div className="min-h-screen bg-ivory">
      <Head><title>Admin · Aura Suites</title><meta name="robots" content="noindex,nofollow" /></Head>
      <header className="flex items-center justify-between bg-ink px-5 py-3 text-gold-light">
        <span className="flex items-center gap-3 font-serif text-lg tracking-widest"><img src="/logo-mark.png" alt="" className="h-8" /> AURA SUITES · ADMIN</span>
        {auth === 'in' && <button className="text-sm underline" onClick={logout}>Sign out</button>}
      </header>
      {auth === 'loading' && <p className="p-10 text-center text-ink/60">Loading…</p>}
      {auth === 'out' && (
        <form onSubmit={login} className="mx-auto mt-20 max-w-sm space-y-4 border border-gold/40 bg-white p-6" data-testid="login">
          <h1 className="text-3xl">Sign in</h1>
          <div><label className="label" htmlFor="pw">Password</label><input id="pw" type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></div>
          {err && <p className="err">{err}</p>}
          {!info.configured && <p className="err">Admin is not configured on this server.</p>}
          <button className="btn w-full">Sign in</button>
        </form>
      )}
      {auth === 'in' && (
        <div className="mx-auto max-w-6xl px-5 py-8">
          {!info.database && <p className="mb-4 border border-red-300 bg-red-50 p-3 text-sm">The database is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).</p>}
          <div className="mb-6 flex flex-wrap gap-2" role="tablist">
            {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm ${tab === t ? 'bg-ink text-gold-light' : 'border border-ink/20 bg-white'}`}>{t}</button>)}
          </div>
          <div className="bg-white p-5">
            {tab === 'Bookings' && <Bookings ctx={ctx} hotels={hotels} />}
            {tab === 'Hotels' && <Hotels ctx={ctx} onChanged={loadHotels} />}
            {tab === 'Rooms & rates' && <Rooms ctx={ctx} hotels={hotels} onChanged={loadHotels} />}
            {tab === 'Availability' && <Availability ctx={ctx} hotels={hotels} />}
          </div>
        </div>
      )}
    </div>
  );
}
