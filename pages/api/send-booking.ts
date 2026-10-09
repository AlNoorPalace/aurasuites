import nodemailer from 'nodemailer';
import { route, parse } from '../../lib/api';
import { requestSchema } from '../../lib/schemas';
import { CONTACT } from '../../data/hotels';

const esc = (s: string) => s.replace(/[\r\n]+/g, ' ');

/** Email fallback used when the booking engine is not available. */
export default route(['POST'], async (req, res) => {
  const p = parse(requestSchema, req.body, res);
  if (!p) return;
  const { GMAIL_USER, GMAIL_PASS } = process.env;
  const to = process.env.HOTEL_BOOKING_EMAIL || CONTACT.email;
  if (!GMAIL_USER || !GMAIL_PASS) return res.status(503).json({ error: 'email_not_configured' });
  const transport = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_PASS } });
  await transport.sendMail({
    from: GMAIL_USER, to, replyTo: p.email,
    subject: `Stay enquiry: ${esc(p.hotel)} (${p.check_in} to ${p.check_out})`,
    text: `Hotel: ${p.hotel}\nName: ${p.name}\nPhone: ${p.phone}\nEmail: ${p.email}\nCheck-in: ${p.check_in}\nCheck-out: ${p.check_out}\nGuests: ${p.guests}\n\n${p.message}`,
  });
  res.status(200).json({ ok: true });
}, { noDb: true, limit: ['email', 5, 10 * 60_000] });
