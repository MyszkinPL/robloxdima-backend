import type { MetadataRoute } from "next"

export const dynamic = "force-static"

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return [
    {
      url: "https://rbtrade.org",
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://rbtrade.org/faq",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://rbtrade.org/support",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ]
}
