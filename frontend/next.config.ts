import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permitir acceso desde cualquier host en la red local
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
  // Configuración para desarrollo en red local
  serverExternalPackages: [],
};

export default nextConfig;
