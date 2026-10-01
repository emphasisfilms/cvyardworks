'use client';

// FEATURE: client-history — fills the empty slot in a client pin's popup with
// that client's GPS service history. Renders nothing itself.
//
// The map announces each opened client popup with a `cvy:client-popup` event
// carrying the client id and the empty slot element; this listens for it.

import { useEffect } from 'react';
import { etDate, etTime, fmtMins } from '../shared';
import { getClientHistoryAction } from './actions';

interface PopupDetail {
  clientId: string;
  slot: HTMLElement;
  refresh: () => void; // re-measure the popup after its content grows
}

export default function ClientHistory() {
  useEffect(() => {
    const onOpen = async (ev: Event) => {
      const { clientId, slot, refresh } = (ev as CustomEvent<PopupDetail>).detail;
      if (slot.dataset.loaded) return;
      slot.dataset.loaded = '1';
      slot.innerHTML = '<small>Loading service history…</small>';
      const res = await getClientHistoryAction(clientId);
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
      refresh();
    };
    document.addEventListener('cvy:client-popup', onOpen);
    return () => document.removeEventListener('cvy:client-popup', onOpen);
  }, []);

  return null;
}
