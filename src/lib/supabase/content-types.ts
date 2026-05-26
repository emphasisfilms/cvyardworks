// Shape of each JSONB row in cvy_site_content. The `key` column determines
// which shape the `value` column takes — keep this in sync with schema.sql seed.

export interface HeroContent {
  tagline: string;
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  backgroundPath: string | null;
}

export interface HomeAboutContent {
  heading: string;
  headingAccent: string;
  paragraphs: string[];
  imagePath: string | null;
}

export interface HomeServicesIntroContent {
  heading: string;
  headingAccent: string;
  subtitle: string;
}

export interface HomeCtaContent {
  heading: string;
  headingAccent: string;
  subtitle: string;
}

export interface ContactPageContent {
  heading: string;
  headingAccent: string;
  subtitle: string;
  phoneNote: string;
  locationNote: string;
  hoursValue: string;
  hoursNote: string;
  ctaHeading: string;
  ctaHeadingAccent: string;
  ctaBody: string;
}

export interface CareersPerk {
  title: string;
  body: string;
}

export interface CareersPosition {
  title: string;
  detail: string;
}

export interface CareersPageContent {
  heading: string;
  headingAccent: string;
  subtitle: string;
  perks: CareersPerk[];
  positions: CareersPosition[];
}

export interface EstimatePageContent {
  heading: string;
  headingAccent: string;
  subtitle: string;
  benefits: string[];
}

export interface SiteSettingsContent {
  businessName: string;
  shortName: string;
  phone: string;
  phoneTel: string;
  location: string;
  serviceArea: string;
  hoursLine: string;
  social: { facebook: string | null; instagram: string | null };
}

export type ContentKey =
  | 'hero'
  | 'home_about'
  | 'home_services_intro'
  | 'home_cta'
  | 'contact_page'
  | 'careers_page'
  | 'estimate_page'
  | 'site_settings';

export interface ContentByKey {
  hero: HeroContent;
  home_about: HomeAboutContent;
  home_services_intro: HomeServicesIntroContent;
  home_cta: HomeCtaContent;
  contact_page: ContactPageContent;
  careers_page: CareersPageContent;
  estimate_page: EstimatePageContent;
  site_settings: SiteSettingsContent;
}

export interface Service {
  id: string;
  season: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  items: string[];
  photo_path: string | null;
  sort_order: number;
}
