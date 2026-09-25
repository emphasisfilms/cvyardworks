// Site-wide SEO constants and structured-data builders.
// Business facts here should match the Google Business Profile (NAP).

import type { SiteSettingsContent } from '@/lib/supabase/content-types';
import { GOOGLE_MAPS_URL } from '@/lib/reviews';

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cvyardworks.com';

export const BUSINESS_NAME = 'Connecticut Valley Yard Works';
export const SHORT_NAME = 'CV Yard Works';
export const PHONE_DISPLAY = '(603) 499-6799';
export const PHONE_E164 = '+1-603-499-6799';

// Towns we want to rank in. NH first, then VT across the river.
export const AREA_NH = [
  'Walpole', 'North Walpole', 'Alstead', 'Westmoreland', 'Charlestown',
  'Langdon', 'Keene', 'Surry', 'Marlow', 'Chesterfield', 'Swanzey', 'Hinsdale',
];
export const AREA_VT = [
  'Bellows Falls', 'Westminster', 'Rockingham', 'Saxtons River', 'Putney',
  'Brattleboro', 'Springfield', 'Chester',
];

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

// Parse "Mon – Fri · 8:00 AM – 4:00 PM" into a schema.org OpeningHoursSpecification.
function openingHoursFrom(hoursLine: string | undefined) {
  const line = hoursLine ?? 'Mon – Fri · 8:00 AM – 4:00 PM';
  const to24 = (t: string) => {
    const m = t.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (!m) return null;
    let h = parseInt(m[1], 10) % 12;
    if (m[3].toUpperCase() === 'PM') h += 12;
    return `${String(h).padStart(2, '0')}:${m[2] ?? '00'}`;
  };
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const abbr: Record<string, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
  const dayMatch = line.match(/([A-Za-z]{3})[a-z]*\s*[–-]\s*([A-Za-z]{3})/);
  const timeMatch = line.match(/(\d{1,2}(?::\d{2})?\s*[AP]M)\s*[–-]\s*(\d{1,2}(?::\d{2})?\s*[AP]M)/i);
  if (!dayMatch || !timeMatch) return undefined;
  const start = abbr[dayMatch[1].toLowerCase()];
  const end = abbr[dayMatch[2].toLowerCase()];
  const opens = to24(timeMatch[1]);
  const closes = to24(timeMatch[2]);
  if (!start || !end || !opens || !closes) return undefined;
  const si = days.indexOf(start), ei = days.indexOf(end);
  const dayOfWeek = days.slice(si, ei + 1);
  return [{ '@type': 'OpeningHoursSpecification', dayOfWeek, opens, closes }];
}

export function businessJsonLd(settings?: SiteSettingsContent | null) {
  const s = settings ?? undefined;
  const sameAs = [GOOGLE_MAPS_URL, s?.social?.facebook, s?.social?.instagram].filter(Boolean) as string[];
  return {
    '@type': ['LocalBusiness', 'HomeAndConstructionBusiness'],
    '@id': `${SITE_URL}/#business`,
    name: s?.businessName ?? BUSINESS_NAME,
    alternateName: [SHORT_NAME, 'CVYW'],
    description:
      'Landscaping, lawn care and snow removal for homes and businesses in Walpole, NH and the Connecticut River Valley. Lawn installation, mulching, mowing, fall cleanup, plowing, sanding and salting.',
    url: `${SITE_URL}/`,
    telephone: PHONE_E164,
    image: absoluteUrl('/opengraph-image.jpg'),
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Walpole',
      addressRegion: 'NH',
      postalCode: '03608',
      addressCountry: 'US',
    },
    areaServed: [
      ...AREA_NH.map((c) => ({ '@type': 'City', name: `${c}, NH` })),
      ...AREA_VT.map((c) => ({ '@type': 'City', name: `${c}, VT` })),
      { '@type': 'State', name: 'New Hampshire' },
      { '@type': 'State', name: 'Vermont' },
    ],
    openingHoursSpecification: openingHoursFrom(s?.hoursLine),
    ...(sameAs.length ? { sameAs } : {}),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Services',
      itemListElement: [
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Landscaping and lawn installation', url: `${SITE_URL}/services/landscaping` } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Lawn care and mowing', url: `${SITE_URL}/services/lawn-care` } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Fall cleanup and leaf removal', url: `${SITE_URL}/services/fall-cleanup` } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Snow removal and plowing', url: `${SITE_URL}/services/snow-removal` } },
      ],
    },
  };
}

export function websiteJsonLd() {
  return {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: BUSINESS_NAME,
    publisher: { '@id': `${SITE_URL}/#business` },
    inLanguage: 'en-US',
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function graph(...nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}

// Per-page metadata helper. Next.js replaces a parent's `openGraph` / `twitter`
// objects wholesale when a page sets its own, which would drop the share image,
// so every page builds its metadata through this to keep the image attached.
export const OG_IMAGE = {
  url: '/opengraph-image.jpg',
  width: 1200,
  height: 630,
  alt: 'Connecticut Valley Yard Works, Walpole, NH',
};

export function pageMetadata(opts: {
  title: string;        // full <title>, no site suffix added
  description: string;
  path: string;         // '/contact'
}) {
  return {
    title: { absolute: opts.title },
    description: opts.description,
    alternates: { canonical: opts.path },
    openGraph: {
      type: 'website' as const,
      url: opts.path,
      title: opts.title,
      description: opts.description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: opts.title,
      description: opts.description,
      images: [OG_IMAGE.url],
    },
  };
}
