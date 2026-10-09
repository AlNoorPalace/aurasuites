import { useState } from 'react';
import Img from './Img';

export default function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const list = images.length ? images : [null];
  return (
    <div>
      <Img src={list[i]} alt={alt} className="aspect-[16/9] w-full" sizes="(min-width:1024px) 60vw, 100vw" priority />
      {list.length > 1 && (
        <div className="mt-2 grid grid-cols-5 gap-2 md:grid-cols-6">
          {list.map((u, k) => (
            <button key={u} type="button" onClick={() => setI(k)} aria-label={`Photo ${k + 1}`} className={`block border-2 ${k === i ? 'border-gold' : 'border-transparent'}`}>
              <Img src={u} alt="" className="aspect-[4/3] w-full" sizes="120px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
