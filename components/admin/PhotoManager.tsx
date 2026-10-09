import { useRef, useState } from 'react';
import { ImagePlus, Star, Trash2 } from 'lucide-react';
import Img from '../Img';
import { api, friendly } from '../../lib/client';

/** Shrinks a photo in the browser to at most 1600px wide WebP. */
export async function shrink(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / bmp.width);
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  const blob: Blob = await new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('encode'))), 'image/webp', 0.82));
  return await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = no; r.readAsDataURL(blob); });
}

export default function PhotoManager({ images, max, onChange, onRemoved, bundled, mainLabel }: {
  images: string[]; max: number; onChange: (next: string[]) => void; onRemoved: (url: string) => void; bundled: string[]; mainLabel: 'cover' | 'main';
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [picker, setPicker] = useState(false);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setMsg('');
    let list = [...images];
    for (const file of Array.from(files)) {
      if (list.length >= max) { setMsg(`You can add at most ${max} photos.`); break; }
      try {
        const data = await shrink(file);
        const r = await api<{ url: string }>('/api/admin/upload', { method: 'POST', body: { data } });
        if (!r.ok) { setMsg(friendly(r)); break; }
        list = [...list, r.data.url];
        onChange(list);
      } catch { setMsg(`Could not read ${file.name}.`); }
    }
    setBusy(false);
    if (input.current) input.current.value = '';
  };
  const remove = (u: string) => { onChange(images.filter((x) => x !== u)); onRemoved(u); };
  const makeMain = (u: string) => onChange([u, ...images.filter((x) => x !== u)]);
  const label = mainLabel === 'cover' ? 'Make cover' : 'Make main';

  return (
    <div data-testid="photo-manager">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {images.map((u, i) => (
          <div key={u} className="border border-ink/10">
            <Img src={u} alt={`Photo ${i + 1}`} className="aspect-[4/3] w-full" sizes="200px" />
            <div className="flex items-center justify-between p-1 text-xs">
              {i === 0 ? <span className="flex items-center gap-1 text-gold-dark"><Star size={12} /> {mainLabel === 'cover' ? 'Cover' : 'Main'}</span> : <button type="button" onClick={() => makeMain(u)} className="text-gold-dark">{label}</button>}
              <button type="button" aria-label="Delete photo" onClick={() => remove(u)} className="text-red-700"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload(e.target.files)} data-testid="photo-input" />
        <button type="button" className="btn !py-2" disabled={busy || images.length >= max} onClick={() => input.current?.click()}><ImagePlus size={14} /> {busy ? 'Uploading…' : 'Upload photos'}</button>
        {bundled.length > 0 && <button type="button" className="btn btn-ghost !py-2" onClick={() => setPicker(!picker)}>Pick site photo</button>}
        <span className="text-xs text-ink/50">{images.length} / {max}</span>
        {msg && <span className="err">{msg}</span>}
      </div>
      {picker && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {bundled.filter((b) => !images.includes(b)).map((b) => (
            <button key={b} type="button" disabled={images.length >= max} onClick={() => onChange([...images, b])}><Img src={b} alt={b} className="aspect-square w-full" sizes="100px" /></button>
          ))}
        </div>
      )}
    </div>
  );
}
