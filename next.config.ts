import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader:false,
  turbopack:{rules:{'*.css':{loaders:['@tailwindcss/turbopack'],as:'*.css'}}},
  async headers(){return [{source:'/(.*)',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'Content-Security-Policy',value:"default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'"+(process.env.NODE_ENV==='development'?" 'unsafe-eval'":"")+"; connect-src 'self' ws: wss:; font-src 'self' data:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'"}]}];},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pinimg.com",
        pathname: "/originals/**",
      },
    ],
  },
};

export default nextConfig;
