import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Sitemap {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: 'https://vreden-api-root-page.vercel.app/sitemap.xml',
  }
}
