// Content for the dedicated service landing pages (/services/<slug>).
// These are the pages we want to rank for "<service> Walpole NH" searches.
// Photos reference the same storage paths the homepage service cards use.

export interface ServicePage {
  slug: string;
  season: 'spring' | 'summer' | 'fall' | 'winter';
  name: string;              // short name for nav/breadcrumbs
  heading: string;           // H1 first part
  headingAccent: string;     // H1 accent
  title: string;             // <title>
  description: string;       // meta description
  photoPath: string;
  intro: string[];
  included: { title: string; body: string }[];
  faqs: { q: string; a: string }[];
  serviceType: string;       // schema.org Service.serviceType
}

export const SERVICE_PAGES: ServicePage[] = [
  {
    slug: 'landscaping',
    season: 'spring',
    name: 'Landscaping',
    heading: 'Landscaping &',
    headingAccent: 'Lawn Installation',
    title: 'Landscaping & Lawn Installation in Walpole, NH | CV Yard Works',
    description:
      'Landscaping, lawn installation (sod, hydroseeding, hand seeding), landscape design, spring cleanup and mulching in Walpole, NH and the Connecticut River Valley. Free estimates.',
    photoPath: 'services/spring/barkMulching.jpg',
    intro: [
      'From a brand-new lawn to a full landscape refresh, Connecticut Valley Yard Works handles the spring and summer projects that make a property look finished. We install lawns by sod, hydroseeding or hand seeding, design and plant beds, spread bark mulch and do the heavy spring cleanup that gets a yard ready for the season.',
      'We work on homes, camps and commercial properties across Walpole, Keene, Charlestown, Alstead and the Vermont side of the river around Bellows Falls and Brattleboro.',
    ],
    included: [
      { title: 'Lawn installation', body: 'Sod for an instant lawn, hydroseeding for larger areas, or hand seeding and overseeding to thicken what you have. Grading and topsoil included where needed.' },
      { title: 'Landscape design and planting', body: 'New beds, foundation plantings, shrubs and perennials chosen for New Hampshire winters.' },
      { title: 'Spring cleanup', body: 'Winter debris, leftover leaves, bed edging and a first cut so the season starts clean.' },
      { title: 'Bark mulching', body: 'Fresh mulch delivered and spread in beds and around trees, with edges cut sharp.' },
    ],
    faqs: [
      { q: 'What is the best way to put in a new lawn in New Hampshire?', a: 'It depends on the size of the area and how fast you want results. Sod gives you a finished lawn immediately, hydroseeding is the most economical for large areas, and hand seeding works well for repairs and small yards. We will recommend the right option when we look at the site.' },
      { q: 'When should spring cleanup and mulching be done?', a: 'As soon as the ground firms up, usually April into May in the Connecticut Valley. Booking early gets you on the schedule before the busiest weeks.' },
      { q: 'Do you offer free estimates for landscaping?', a: 'Yes. Request a free estimate online or call (603) 499-6799 and we will come out, look at the property and give you a written quote with no obligation.' },
    ],
    serviceType: 'Landscaping',
  },
  {
    slug: 'lawn-care',
    season: 'summer',
    name: 'Lawn Care',
    heading: 'Lawn Care &',
    headingAccent: 'Mowing',
    title: 'Lawn Care & Mowing Service in Walpole, NH | CV Yard Works',
    description:
      'Weekly mowing, lawn maintenance, bush and hedge trimming and fertilizing programs for homes and businesses in Walpole, NH and the Connecticut River Valley. Free estimates.',
    photoPath: 'services/summer/lawnmower.png',
    intro: [
      'A good lawn is a weekly job. Our crews run regular mowing routes through Walpole and the surrounding towns all summer, keeping lawns cut, edges trimmed and beds tidy so you never have to think about it.',
      'Residential customers get a reliable weekly or bi-weekly visit. Commercial properties, rentals and associations get a maintenance plan sized to the site.',
    ],
    included: [
      { title: 'Mowing and trimming', body: 'Scheduled mowing with string trimming around beds, fences and foundations, and clippings handled the way you prefer.' },
      { title: 'Bush and hedge trimming', body: 'Shaping hedges, shrubs and foundation plantings so they stay healthy and in bounds.' },
      { title: 'Fertilizing programs', body: 'Seasonal fertilizer applications timed for New England lawns to build thick, green turf.' },
      { title: 'General lawn care', body: 'Edging, bed weeding and the small jobs that keep a property looking cared for between visits.' },
    ],
    faqs: [
      { q: 'How often should a lawn be mowed in the summer?', a: 'Weekly through the peak growing season, with bi-weekly visits in dry stretches. We set the schedule with you and adjust as the season changes.' },
      { q: 'Do you offer seasonal mowing contracts?', a: 'Yes. Most customers sign up for the season so their spot on the route is guaranteed, and we can bundle spring cleanup and fall leaf cleanup into the same plan.' },
      { q: 'Do you mow commercial properties?', a: 'Yes. We maintain commercial lots, rental properties and multi-unit buildings across the Connecticut Valley, and can combine summer mowing with winter plowing under one contract.' },
    ],
    serviceType: 'Lawn care',
  },
  {
    slug: 'fall-cleanup',
    season: 'fall',
    name: 'Fall Cleanup',
    heading: 'Fall Cleanup &',
    headingAccent: 'Leaf Removal',
    title: 'Fall Cleanup & Leaf Removal in Walpole, NH | CV Yard Works',
    description:
      'Fall leaf cleanup, bed maintenance, perennial cutting and winter mulching in Walpole, NH and the Connecticut River Valley. Get your property ready for winter. Free estimates.',
    photoPath: 'services/fall/hirepage-3.jpg',
    intro: [
      'Fall in the Connecticut Valley means a lot of leaves and a short window to deal with them. We clear leaves from lawns and beds, cut back perennials, tidy beds and lay winter mulch so the property comes through the winter in good shape and spring cleanup is easy.',
      'Fall cleanup pairs naturally with our snow removal contracts, so many customers book both at once.',
    ],
    included: [
      { title: 'Leaf cleanup', body: 'Leaves blown, raked and hauled from lawns, beds, walkways and around foundations, in one visit or several as the trees drop.' },
      { title: 'Bed maintenance', body: 'Beds cleared of annuals and debris, edged and prepared for winter.' },
      { title: 'Perennial cutting', body: 'Perennials and ornamental grasses cut back at the right time for healthy regrowth.' },
      { title: 'Winter mulching', body: 'A protective layer of mulch on beds and around plantings to insulate roots through the freeze.' },
    ],
    faqs: [
      { q: 'When is the best time for fall cleanup?', a: 'After most of the leaves are down, typically late October into November in our area. For properties with a lot of trees we can do an early pass and a final cleanup.' },
      { q: 'Do you haul the leaves away?', a: 'Yes. Leaves and debris are removed from the property unless you would rather we compost them on site.' },
      { q: 'Can fall cleanup be combined with snow plowing?', a: 'Yes. Many customers book fall cleanup and a winter plowing contract together so the property is covered straight through to spring.' },
    ],
    serviceType: 'Fall cleanup',
  },
  {
    slug: 'snow-removal',
    season: 'winter',
    name: 'Snow Removal',
    heading: 'Snow Removal &',
    headingAccent: 'Plowing',
    title: 'Snow Removal & Plowing in Walpole, NH | CV Yard Works',
    description:
      'Commercial snow removal, residential driveway plowing, roof snow removal, sanding and salting in Walpole, NH and the Connecticut River Valley. Seasonal contracts. Free estimates.',
    photoPath: 'services/winter/winterTruck.jpg',
    intro: [
      'When it snows in the Connecticut Valley, our trucks are out. Connecticut Valley Yard Works plows commercial lots, private roads and residential driveways, sands and salts for ice, and clears heavy snow loads off roofs before they become a problem.',
      'We run seasonal plowing contracts so you know your driveway or lot will be open, storm after storm, without a call each time.',
    ],
    included: [
      { title: 'Commercial snow removal', body: 'Parking lots, storefronts, rental properties and associations plowed on a set trigger depth, with sanding and salting as needed.' },
      { title: 'Residential driveway plowing', body: 'Seasonal contracts for homes and camps around Walpole and the surrounding towns. Reliable, and we come back for the town plow berm.' },
      { title: 'Roof snow removal', body: 'Safe removal of heavy snow and ice loads from roofs to protect against leaks and structural damage.' },
      { title: 'Sanding and salting', body: 'Ice control for driveways, lots and walkways before and after storms.' },
    ],
    faqs: [
      { q: 'How does a seasonal plowing contract work?', a: 'You sign up once for the winter. We plow automatically whenever snowfall reaches the agreed depth, with sanding or salting added if you want it, and you are billed by the season or per storm depending on the plan.' },
      { q: 'When should I book snow plowing?', a: 'Before the first storm, ideally by October. Routes fill up, and we prioritize contract customers when a big storm hits.' },
      { q: 'Do you plow commercial lots overnight?', a: 'Yes. Commercial customers set the trigger depth and the time the lot needs to be open, and we plan the route around it.' },
    ],
    serviceType: 'Snow removal',
  },
];

export const SEASON_TO_SLUG: Record<string, string> = Object.fromEntries(
  SERVICE_PAGES.map((p) => [p.season, p.slug])
);

export function getServicePage(slug: string): ServicePage | undefined {
  return SERVICE_PAGES.find((p) => p.slug === slug);
}
