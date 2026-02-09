export interface Service {
  id: string;
  season: string;
  icon: string;
  color: string;
  title: string;
  description: string;
  items: string[];
}

export const services: Service[] = [
  {
    id: 'spring',
    season: 'Spring',
    icon: '🌱',
    color: '#6abf69',
    title: 'Spring Services',
    description:
      'Get your property ready for the growing season with our comprehensive spring services.',
    items: [
      'Lawn Installation (Sod, Hydro Seeding, Hand Seeding)',
      'Landscaping & Design',
      'Spring Cleanup',
      'Mulching',
    ],
  },
  {
    id: 'summer',
    season: 'Summer',
    icon: '☀️',
    color: '#d4a017',
    title: 'Summer Services',
    description:
      'Keep your lawn and landscape looking pristine all summer long.',
    items: [
      'Mowing & Lawn Maintenance',
      'Bush & Hedge Trimming',
      'Fertilizing Programs',
      'General Lawn Care',
    ],
  },
  {
    id: 'fall',
    season: 'Fall',
    icon: '🍂',
    color: '#c46b2e',
    title: 'Fall Services',
    description:
      'Prepare your property for winter with thorough fall maintenance.',
    items: [
      'Leaf Cleanup',
      'Bed Maintenance',
      'Perennial Cutting',
      'Mulching for Winter Protection',
    ],
  },
  {
    id: 'winter',
    season: 'Winter',
    icon: '❄️',
    color: '#7bb8d9',
    title: 'Winter Services',
    description:
      'Reliable snow removal to keep your property safe and accessible.',
    items: [
      'Commercial Snow Removal',
      'Residential Driveway Plowing',
      'Roof Snow Removal',
      'Sanding & Salting',
    ],
  },
];
