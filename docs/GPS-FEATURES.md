# GPS features

Everything built on top of the FleetLocate data lives in `src/features/gps/`.
Each feature is one folder plus one or two wiring lines marked with a
`feature: <name>` comment. To remove a feature, delete its folder, delete the
lines carrying its marker, and delete its CSS block in
`src/app/admin/(authed)/admin.css` (also marked `feature: <name>`).

Search for a marker with:

    grep -rn "feature: replay" src

| Feature | Folder | Where it shows | Wiring lines | Stored data |
|---|---|---|---|---|
| `suggested-clients` | `suggested-clients/` | Clients & Routes, panel above the table | `clients/ClientsView.tsx` | `cvy_site_content` key `gps_dismissed_places` |
| `replay` | `replay/` | Map, "Replay a day" button | `MapGpsTools.tsx` | none |
| `client-history` | `client-history/` | Map, inside a client pin's popup | `MapGpsTools.tsx` | none |
| `status-board` | `status-board/` | Trucks & GPS, "Right now" card | `fleet/page.tsx` | none |
| `scorecard` | `scorecard/` | Trucks & GPS, "Daily scorecard" card | `fleet/page.tsx` | none |
| `trails` | `trails/` | Map, "Today's trails" toggle | `MapGpsTools.tsx` | none |
| `heat` | `heat/` | Map, "Time heat map" toggle | `MapGpsTools.tsx` | none |

## The map engine

The admin map and every map feature draw through `src/lib/map-engine/`, never
through a map library directly.

- `types.ts` — the small interface: pins, lines, circles, layers, fit, click.
- `apple-engine.ts` — Apple Maps (MapKit JS). The one we want.
- `leaflet-engine.ts` — OpenStreetMap fallback, used only if Apple Maps is not
  configured or refuses to start. **Removable** once Apple is proven in
  production: delete the file, delete the two fallback branches in `index.ts`,
  and run `npm uninstall leaflet @types/leaflet`.
- `src/lib/apple-maps.ts` and `src/app/api/mapkit/token/` — sign and serve the
  short-lived Apple token. Needs `APPLE_MAPS_TEAM_ID`, `APPLE_MAPS_KEY_ID`,
  `APPLE_MAPS_PRIVATE_KEY` on Vercel (same three app.emphasis uses).

## Shared pieces (keep while any feature remains)

- `shared.ts` — Eastern-time date helpers, formatting, `clusterPoints`.
- `auth.ts` — `signedInClient()`, the sign-in check every action starts with.
- `map-types.ts` — the `{ engine }` handed to map features.
- `MapGpsTools.tsx` — the tool row above the map; one line per map feature.

Two generic hooks in the map itself make the map features possible. They do
nothing when no feature uses them:

- `ClientsMap` accepts an `extras` render prop and calls it with the engine.
- Each client popup ends with an empty `<div class="cvy-pop-extra" data-client="…">`,
  and opening one fires a `cvy:client-popup` event on `document`.

If every map feature is removed, also delete `MapGpsTools.tsx`, the `extras`
prop passed in `map/MapView.tsx`, and (optionally) those two hooks.

## What the features read

All features are read-only views over three tables filled by the sync
(`src/lib/fleet-sync.ts`): `cvy_vehicles`, `cvy_gps_events`, `cvy_visits`.
Only `suggested-clients` writes: it inserts a `cvy_clients` row, re-labels the
stops that produced the suggestion, and records dismissed places.
