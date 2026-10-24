// The map's frame, kept apart from static/geo.json (166 KB) so the map can place pins before the coastline arrives.
// scripts/geo.ts writes both; scripts/dist-check.ts fails the build if they disagree.
export const FRAME = { w: 4000, h: 6056, k: 0.9006982393225879, bbox: [25.6, -80.33, 25.9, -80.11] as [number, number, number, number] };
