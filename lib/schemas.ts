import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date');
const phone = z.string().transform((s) => s.replace(/\D/g, '')).pipe(z.string().min(10, 'Enter a valid phone number').max(15, 'Enter a valid phone number'));
const stay = {
  check_in: date,
  check_out: date,
  rooms: z.coerce.number().int().min(1, 'At least 1 room').max(6, 'At most 6 rooms'),
  adults: z.coerce.number().int().min(1, 'At least 1 adult').max(60),
  children: z.coerce.number().int().min(0).max(60).default(0),
};
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens');

export const availabilitySchema = z.object({ hotel_slug: slug, ...stay });

export const createBookingSchema = z.object({
  hotel_slug: slug,
  room_type_id: z.coerce.number().int().positive(),
  ...stay,
  guest_name: z.string().trim().min(2, 'Enter your name').max(100),
  guest_phone: phone,
  guest_email: z.union([z.literal(''), z.email('Enter a valid email')]).optional(),
  corporate: z.boolean().optional().default(false),
});

export const lookupSchema = z.object({
  reference: z.string().trim().min(4, 'Enter your booking reference').max(20),
  phone,
});

export const requestSchema = z.object({
  hotel: z.string().trim().max(100),
  name: z.string().trim().min(2, 'Enter your name').max(100),
  phone,
  email: z.email('Enter a valid email'),
  check_in: date,
  check_out: date,
  guests: z.coerce.number().int().min(1).max(60),
  message: z.string().max(1000).optional().default(''),
});

export const loginSchema = z.object({ password: z.string().min(1, 'Enter the password').max(200) });

export const adminBookingsQuery = z.object({
  q: z.string().max(100).optional(),
  status: z.enum(['', 'confirmed', 'cancelled']).optional(),
  hotel: z.string().max(100).optional(),
  from: date.optional().or(z.literal('')),
  to: date.optional().or(z.literal('')),
});
export const adminCancelSchema = z.object({ reference: z.string().min(4).max(20) });

const photoUrl = z.string().max(500);
export const hotelSaveSchema = z.object({
  slug,
  name: z.string().trim().min(2, 'Enter a name').max(120),
  create: z.boolean().optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  tagline: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  phone: z.string().transform((s) => s.replace(/\D/g, '')).pipe(z.union([z.literal(''), z.string().regex(/^\d{10}$/, 'Enter a 10-digit phone number')])).optional(),
  lat: z.union([z.literal(''), z.coerce.number().min(-90).max(90)]).nullable().optional(),
  lng: z.union([z.literal(''), z.coerce.number().min(-180).max(180)]).nullable().optional(),
  amenities: z.array(z.string().max(60)).max(40).optional(),
  active: z.boolean().optional(),
  sort_order: z.coerce.number().int().min(-1000).max(1000).optional(),
  images: z.array(photoUrl).max(12, 'At most 12 photos').optional(),
});

export const roomSaveSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  hotel_slug: slug.optional(),
  name: z.string().trim().min(2, 'Enter a name').max(80).optional(),
  total_rooms: z.coerce.number().int().min(0).max(500).optional(),
  base_rate: z.coerce.number().int().min(0).max(1_000_000).optional(),
  max_guests: z.coerce.number().int().min(1).max(20).optional(),
  beds: z.coerce.number().int().min(0).max(20).optional(),
  baths: z.coerce.number().int().min(0).max(20).optional(),
  active: z.boolean().optional(),
  description: z.string().max(600, 'At most 600 characters').optional(),
  images: z.array(photoUrl).max(8, 'At most 8 photos').optional(),
});

export const idSchema = z.object({ id: z.coerce.number().int().positive() });
export const slugSchema = z.object({ slug });
export const calendarQuery = z.object({ room_type_id: z.coerce.number().int().positive(), month: z.string().regex(/^\d{4}-\d{2}$/).optional() });
export const blockSchema = z.object({
  room_type_id: z.coerce.number().int().positive(),
  from: date, to: date,
  rooms: z.coerce.number().int().min(1).max(500),
  reason: z.string().max(200).optional().default(''),
});
export const uploadSchema = z.object({ data: z.string().min(10) });
export const deleteUploadSchema = z.object({ url: z.string().min(1).max(500) });

export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[String(i.path[0] ?? 'form')] ??= i.message;
  return out;
}
