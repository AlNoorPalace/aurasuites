/**
 * Photos for the public site, in one place.
 *
 * Paste direct image links here (for example from Unsplash: https://images.unsplash.com/photo-XXXX?auto=format&fit=crop&w=1600&q=80)
 * or put files in /public/img and use "/img/name.jpg". Any slot left empty shows an elegant placeholder.
 * Photos uploaded to a hotel in /admin are used first on that hotel's card and in the gallery.
 * Allowed remote hosts are listed in next.config.js (images.unsplash.com is allowed).
 */
export const PHOTOS = {
  hero: [
    { src: '', alt: 'Sunlit hotel suite' },
    { src: '', alt: 'Spacious hotel bedroom' },
    { src: '', alt: 'Welcoming hotel lounge' },
  ],
  /** Fallback card photo per hotel slug. */
  locations: { aluva: '', cheranallur: '', kalamassery: '' } as Record<string, string>,
  gallery: [
    { src: '', caption: 'Soft light, quiet mornings' },
    { src: '', caption: 'Space to settle in' },
    { src: '', caption: 'A welcoming first impression' },
    { src: '', caption: 'A restful retreat' },
    { src: '', caption: 'A moment to unwind' },
    { src: '', caption: 'Room to slow down' },
  ],
};
