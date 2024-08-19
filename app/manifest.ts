import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Surveyor',
    short_name: 'Surveyor',
    description: 'App for building surveys quickly.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff',
    theme_color: '#fff',
    icons: [
      {
        src: '/cwbc-logo-icon.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
    screenshots: [{
      src: "/typical-house.webp",
      sizes: "871x572",
      type: "image/webp",
    }]
  }
}