/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.SUPABASE_URL;
let remotePatterns = [];
if (supabaseUrl) {
  const u = new URL(supabaseUrl);
  remotePatterns.push({
    protocol: u.protocol.replace(':', ''),
    hostname: u.hostname,
    ...(u.port ? { port: u.port } : {}),
    pathname: '/storage/v1/object/public/hotel-images/**',
  });
}
module.exports = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { remotePatterns },
};
