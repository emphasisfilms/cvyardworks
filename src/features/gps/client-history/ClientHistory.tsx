'use client';

// FEATURE: client-history — fills the empty slot in a client pin's popup with
// that client's GPS service history. Renders nothing itself.

import { useEffect } from 'react';
import type { MapCtx } from '../map-types';
import { etDate, etTime, fmtMins } from '../shared';
import { getClientHistoryAction } from './actions';

export default function ClientHistory({ ctx }: { ctx: MapCtx }) {
  useEffect(() => {
    const { map } = ctx;
    const onOpen = async (e: { popup: { getElement(): HTMLElement | undefined; update(): void } }) => {
      const slot = e.popup.getElement()?.querySelector<HTMLElement>('.cvy-pop-extra[data-client]');
      const id = slot?.dataset.client;
      if (!slot || !id || slot.dataset.loaded) return;
      slot.dataset.loaded = '1';
      slot.innerHTML = '<small>Loading service history…</small>';
      const res = await getClientHistoryAction(id);
      if (!res.ok) {
        slot.innerHTML = '';
        return;
      }
      const h = res.history;
      slot.innerHTML =
        h.visits === 0
          ? '<small>No truck stops recorded here yet.</small>'
          : `<div class="cvy-pop-history">
               <strong>${h.visits} visit${h.visits === 1 ? '' : 's'}</strong>${h.avgMinutes ? ` · avg ${fmtMins(h.avgMinutes)}` : ''}
               <ul>${h.last
                 .map(
                   (v) =>
                     `<li>${etDate(v.at)} ${etTime(v.at)} · ${fmtMins(v.minutes)} · ${v.truck}${v.shared > 1 ? ` <em>(shared stop, ${v.shared} clients)</em>` : ''}</li>`
                 )
                 .join('')}</ul>
             </div>`;
      e.popup.update(); // re-measure now that the popup is taller
    };
    map.on('popupopen', onOpen as never);
    return () => {
      map.off('popupopen', onOpen as never);
    };
  }, [ctx]);

  return null;
}
