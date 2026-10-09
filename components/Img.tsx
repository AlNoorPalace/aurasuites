import Image from 'next/image';

/** Photo with a dark placeholder until a real image is set. */
export default function Img({ src, alt, className = '', sizes = '(min-width:1024px) 33vw, 100vw', priority = false }: { src?: string | null; alt: string; className?: string; sizes?: string; priority?: boolean }) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-[#22343c] to-[#0e171c] ${className}`}>
      {src ? <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={/^http:\/\/(localhost|127\.)/.test(src)} className="object-cover" /> : (
        <img src="/logo-mark.png" alt="" className="absolute left-1/2 top-1/2 w-1/4 max-w-[96px] -translate-x-1/2 -translate-y-1/2 opacity-30" />
      )}
    </div>
  );
}
