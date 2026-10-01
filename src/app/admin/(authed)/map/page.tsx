import Link from 'next/link';
import { fleetLocateReady } from '@/lib/fleetlocate';
import { appleMapsReady } from '@/lib/apple-maps';
import { loadClientsAndTeams } from '../clients/load';
import MapView from './MapView';

export const dynamic = 'force-dynamic';
// Looking up a batch of addresses takes a few seconds.
export const maxDuration = 60;

export default async function AdminMapPage() {
  const { clients, teams, error, geoReady } = await loadClientsAndTeams();
  const fleetReady = fleetLocateReady();

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Map</h1>
          <p className="admin-page-subtitle">
            Every client pinned and colored by team, with live truck positions from FleetLocate.
            Edit clients on <Link href="/admin/clients">Clients &amp; Routes</Link>.
          </p>
        </div>
      </div>

      {error && (
        <div className="admin-notice">
          Couldn’t load clients: {error.message}. Open{' '}
          <Link href="/admin/clients">Clients &amp; Routes</Link> for details.
        </div>
      )}

      <MapView
        initial={clients}
        teams={teams}
        disabled={!!error}
        geoReady={geoReady}
        fleetReady={fleetReady}
        appleReady={appleMapsReady()}
      />
    </>
  );
}
