import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Survii',
    short_name: 'Survii',
    description: 'Surveying simplified.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff',
    theme_color: '#fff',
    icons: [
      {
        src: '/app-icon.png',
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