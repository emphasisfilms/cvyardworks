// One stable color per team number, shared by the map, the tables and legends.
const PALETTE = [
  '#2f7a3e', // 1 green
  '#1f6fb2', // 2 blue
  '#d97706', // 3 orange
  '#8e44ad', // 4 purple
  '#c0392b', // 5 red
  '#0e8a83', // 6 teal
  '#b5651d', // 7 brown
  '#5b6b60', // 8 slate
  '#d6336c', // 9 pink
  '#4b5bd6', // 10 indigo
];

export const UNASSIGNED_COLOR = '#9aa5a0';

export function teamColor(team: string | number | null | undefined): string {
  if (team == null || team === '') return UNASSIGNED_COLOR;
  const n = typeof team === 'number' ? team : parseInt(team, 10);
  if (!Number.isFinite(n) || n < 1) return UNASSIGNED_COLOR;
  return PALETTE[(n - 1) % PALETTE.length];
}
