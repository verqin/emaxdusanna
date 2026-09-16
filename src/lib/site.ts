/** Canonical public origin for absolute SEO URLs. */
export const SITE_URL = "https://edusanna.com";

/** Default 1200x630 social sharing card. */
export const OG_IMAGE = `${SITE_URL}/og-cover.jpg`;

export const absoluteUrl = (path: string) =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * Builds the standard per-page head payload: title, description, canonical,
 * Open Graph and Twitter tags with an absolute share image.
 */
export function pageHead(opts: {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: string;
}) {
  const url = absoluteUrl(opts.path);
  const image = opts.image ?? OG_IMAGE;
  return {
    meta: [
      { title: opts.title },
      { name: "description", content: opts.description },
      { property: "og:title", content: opts.title },
      { property: "og:description", content: opts.description },
      { property: "og:url", content: url },
      { property: "og:type", content: opts.type ?? "website" },
      { property: "og:image", content: image },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: opts.title },
      { name: "twitter:description", content: opts.description },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
