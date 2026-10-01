// FEATURE: suggested-clients — shared types.
import type { ClientDay } from '@/lib/supabase/content-types';

export interface Suggestion {
  key: string;
  lat: number;
  lng: number;
  address: string;
  stops: number;
  days: number; // distinct days a truck stopped here
  weekday: ClientDay | null; // set when most stops fall on one weekday
  minutes: number; // typical time on site, rounded to 5
  trucks: string[];
  team: string | null;
  lastAt: string;
  visitIds: string[];
  // False for places that look like fuel, coffee or supply runs: short stops,
  // many times a week, by most of the fleet.
  likely: boolean;
}
