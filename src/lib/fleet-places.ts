// Operational places: spots trucks stop at that are neither a client nor the
// shop, such as the debris landing. They are stored as a list in
// cvy_site_content under the key `gps_places`:
//
//   [{ "name": "Debris landing", "kind": "dump", "lat": …, "lng": …, "radius_m": 120 }]
//
// A stop inside a place's radius is saved with that place's `kind`, which keeps
// it out of client suggestions and lets reports count it separately.

export interface FleetPlace {
  name: string;
  kind: string; // short code stored on the visit, e.g. "dump"
  lat: number;
  lng: number;
  radius_m: number;
}

// How each non-client kind reads in the admin.
export const KIND_LABELS: Record<string, string> = {
  shop: 'Shop',
  dump: 'Debris landing',
};

// Kinds that are our own places rather than somewhere a crew was working.
export const isOperational = (kind: string) => kind in KIND_LABELS;
