import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RN Command Center',
    short_name: 'RN',
    description: 'Fantasy football command center — rosters, matchups, and the GM that has your back.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0b1a',
    theme_color: '#736ef5',
    categories: ['sports', 'productivity'],
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
