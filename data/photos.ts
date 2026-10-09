/**
 * Photos for the public site, in one place.
 *
 * These are Unsplash stock photos (hotlinked; not photos of Aura Suites). Replace any of them anytime.
 * Paste direct image links here (for example from Unsplash: https://images.unsplash.com/photo-XXXX?auto=format&fit=crop&w=1600&q=80)
 * or put files in /public/img and use "/img/name.jpg". Any slot left empty shows an elegant placeholder.
 * Photos uploaded to a hotel in /admin are used first on that hotel's card and in the gallery.
 * Allowed remote hosts are listed in next.config.js (images.unsplash.com is allowed).
 */
export const PHOTOS = {
  hero: [
    { src: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=80', alt: 'Sunlit hotel suite' },
    { src: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1600&q=80', alt: 'Spacious hotel bedroom' },
    { src: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1600&q=80', alt: 'Welcoming hotel lounge' },
  ],
  /** Fallback card photo per hotel slug. */
  locations: { aluva: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80', cheranallur: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=80', kalamassery: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1000&q=80' } as Record<string, string>,
  gallery: [
    { src: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80', caption: 'Soft light, quiet mornings' },
    { src: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80', caption: 'Space to settle in' },
    { src: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80', caption: 'A welcoming first impression' },
    { src: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80', caption: 'A restful retreat' },
    { src: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80', caption: 'A moment to unwind' },
    { src: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80', caption: 'Room to slow down' },
  ],
};
