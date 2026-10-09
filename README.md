# Aura Suites

Hotel website, booking engine and admin panel for Aura Suites (Aluva, Cheranallur, Kalamassery, Kochi).

Next.js 15 (Pages Router), React 18, TypeScript, Tailwind 3, Framer Motion, lucide-react, zod 4.
Data lives in Supabase Postgres, reached **only from the server** with the service-role key.
 
## Setup (in this order)

1. **Create a Supabase project.**
2. **Run the migrations** in `supabase/migrations/`, in order, in the SQL editor (each is safe to run twice):
   `001_schema.sql`, `002_booking_functions.sql`, `003_admin_functions.sql`, `004_security.sql`, then optionally `005_seed.sql`
   (starter hotels and one placeholder room per hotel).
3. **Create a storage bucket** named `hotel-images` and make it **public**.
4. **Set the environment variables** (copy `.env.example`). `ADMIN_SESSION_SECRET` must be at least 32 random characters.
5. **Deploy / redeploy.** `SUPABASE_URL` is also read at build time for `next.config.js` image settings, so redeploy after setting it.
6. **Open `/admin`**, sign in, and set the real room counts and rates under *Rooms & rates* (the seed values are placeholders).

## Admin panel (`/admin`)

- **Bookings**: search, filter, summary, cancel.
- **Hotels**: add / edit / show / hide / delete (blocked if any booking exists, even cancelled), photos (up to 12, first is the cover).
- **Rooms & rates**: add room types, edit inline, "Bookable" switch, description and photos (up to 8).
- **Availability**: month calendar per room type, plus closures (dates, rooms, reason).

Login is a password compared in constant time; the session is an HMAC-signed, httpOnly, SameSite=Strict cookie valid for 12 hours.
Admin writes check the `Origin` header. Login and public endpoints are rate-limited (in memory, per server instance).

## Booking rules

Prices are computed in the database. 1–365 nights, 1–6 rooms, guests must fit (max guests × rooms). A 20% corporate discount
applies only if the guest ticks "corporate". Guests cancel with reference + phone, until the stay starts. Payment is at the hotel.
The optional UPI card is shown only when `NEXT_PUBLIC_UPI_ID` is set.

## Local development

```bash
npm install
npm run dev:db          # PGlite stand-in for Supabase on :54321 (applies the migrations)
SUPABASE_URL=http://localhost:54321 SUPABASE_SERVICE_ROLE_KEY=dev \
ADMIN_PASSWORD=admin ADMIN_SESSION_SECRET=$(printf 'x%.0s' {1..40}) npm run dev
npm test                # migrations on PGlite + unit tests
npm run test:e2e        # builds the site and drives it with Playwright against the stand-in
```

If Supabase is not configured or unreachable the site falls back to the built-in hotel list (`data/hotels.ts`) and an
email request form instead of the booking engine.

## Known limits

- **UPI payments are not verified** by the website, and there is no payment gateway. The hotel matches payments to bookings by reference.
- Rate limiting is in memory and per instance, so it is not a global limit on serverless hosts.
- The email fallback needs `GMAIL_USER` / `GMAIL_PASS` (a Gmail app password).
- Photos in the stand-in are kept in memory; real storage needs the Supabase bucket.
