import type { MetadataRoute } from 'next';

const BASE_URL = 'https://gombang.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${BASE_URL}/`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/record`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}
