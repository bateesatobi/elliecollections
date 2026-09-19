import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Elliecollections';
const DEFAULT_DESCRIPTION =
  'Shop feminine fashion at Elliecollections — apparel, accessories, and everyday luxury curated for her. Soft silhouettes, refined pieces, delivery across East Africa.';
const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80';

function siteOrigin(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL as string | undefined;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://elliecollections.com';
}

type SeoProps = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'product' | 'article';
  noIndex?: boolean;
  keywords?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

export function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image = DEFAULT_IMAGE,
  type = 'website',
  noIndex = false,
  keywords = 'Elliecollections, fashion, women fashion, apparel, accessories, East Africa, Uganda boutique, dresses, bags, jewelry',
  jsonLd,
}: SeoProps) {
  const origin = siteOrigin();
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Fashion for her`;
  const url = `${origin}${path.startsWith('/') ? path : `/${path}`}`;
  const imageUrl = image.startsWith('http') ? image : `${origin}${image}`;
  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet prioritizeSeoTags>
      <html lang="en" />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={SITE_NAME} />
      <meta
        name="robots"
        content={noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}
      />
      <link rel="canonical" href={url} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type === 'product' ? 'product' : 'website'} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:locale" content="en_UG" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      <meta name="theme-color" content="#8B4D5C" />
      <link rel="manifest" href="/site.webmanifest" />

      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}

export function organizationJsonLd() {
  const origin = siteOrigin();
  return {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    name: SITE_NAME,
    url: origin,
    description: DEFAULT_DESCRIPTION,
    image: DEFAULT_IMAGE,
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Plot 12, Acacia Avenue, Kololo',
      addressLocality: 'Kampala',
      addressCountry: 'UG',
    },
  };
}

export function productJsonLd(product: {
  title: string;
  description: string;
  image: string;
  priceUgx: number;
  currency?: string;
  availability: boolean;
  url: string;
  brand?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.image,
    brand: {
      '@type': 'Brand',
      name: product.brand || SITE_NAME,
    },
    offers: {
      '@type': 'Offer',
      url: product.url,
      priceCurrency: product.currency || 'UGX',
      price: product.priceUgx,
      availability: product.availability
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };
}
