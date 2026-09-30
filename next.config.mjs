/** @type {import('next').NextConfig} */
// Static export: `npm run build` writes a plain site to /out for Netlify
const nextConfig = { reactStrictMode: true, output: "export", images: { unoptimized: true } };
export default nextConfig;
