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

// Full hire application payload — stored in cvy_messages.application_data
// when form_type = 'careers'. Keep keys stable so admin view can render them.

export interface ApplicationReference {
  name: string;
  company: string;
  phone: string;
  address: string;
}

export interface ApplicationPreviousEmployment {
  company: string;
  phone: string;
  address: string;
  startingSalary: string;
  endingSalary: string;
  startDate: string;
  endDate: string;
  jobTitle: string;
  reasonForLeaving: string;
}

export interface ApplicationEducationEntry {
  name: string;
  start: string;
  finish: string;
  graduated: boolean;
}

export interface CareersApplication {
  applicant: {
    name: string;
    address: string;
    phone: string;
    email: string;
    age: string;
    dateAvailable: string;
    desiredPosition: string;
    usCitizen: boolean;
    convictedCrime: boolean;
    crimeDetails: string;
  };
  driversLicense: {
    hasLicense: boolean;
    hasCdl: boolean;
    licenseState: string;
    primaryTransportation: string;
    accidents3yr: string;
    violations3yr: string;
  };
  education: {
    highSchool: ApplicationEducationEntry;
    college: ApplicationEducationEntry;
    other: string;
  };
  references: ApplicationReference[];
  previousEmployment: ApplicationPreviousEmployment[];
  military: {
    served: boolean;
    startDate: string;
    endDate: string;
    branch: string;
    rank: string;
    dischargeType: string;
  };
  certification: {
    certified: boolean;
    signature: string;
  };
}

// Row in cvy_clients — the admin "Clients & Routes" table used for crew /
// route planning. Days are short names ('Mon'..'Sun'); null means "any".
export const CLIENT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type ClientDay = (typeof CLIENT_DAYS)[number];

// A client's team is stored as the team number (as text) so the list of teams
// can change in cvy_teams without touching client rows.
export type ClientTeam = string;

// Row in cvy_teams — the admin "Crews & Teams" table.
export interface TeamRow {
  id: string;
  number: number;
  name: string;
  lead_name: string;
  lead_phone: string;
  has_bagger: boolean;
  active: boolean;
  notes: string | null;
}

export interface ClientRow {
  id: string;
  name: string;
  address: string;
  service_minutes: number | null;
  required_day: ClientDay | null;
  current_day: ClientDay | null;
  current_team: ClientTeam | null;
  team_required: boolean; // this property must keep its current team
  bagged: boolean; // clippings must be bagged
  notes: string | null;
  sort_order: number;
}
