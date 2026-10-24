// The shapes of psst's data and plans. The JSON files in src/lib are checked against these at build time.

export type Dow = number; // 0 Sunday .. 6 Saturday
export type HHMM = string; // '18:30'
export type ISODate = string; // '2026-11-20'

export interface OpenWindow {
  days: Dow[];
  from: HHMM;
  to: HHMM; // a 'to' earlier than 'from' runs past midnight; from === to means open all day
  f?: number; // parsed from/to, filled in once at load (core.ts)
  t?: number;
}

export type MoveCategory = 'speakeasy' | 'water' | 'bar' | 'nightlife' | 'coffee' | 'outdoors' | 'music' | 'food' | 'shop' | 'market' | 'art';

/** A move: a place, the hour it's best at, and exactly what to do there. */
export interface Move {
  id: string;
  title: string;
  place: string;
  address: string;
  hood: string;
  lat: number;
  lng: number;
  category: MoveCategory;
  windows: OpenWindow[];
  best: HHMM;
  energy: number; // 1 low-key .. 5 loud
  cost: number; // 1..4
  rainOk: boolean;
  secret: 0 | 1 | 2; // 2 = sealed until a secret is spent on it
  theMove: string;
  getIn?: string;
  why: string;
  sources: string[];
  verifiedOn: ISODate;
  word?: string; // the sticker's word
  clue?: string;
}

export type EventCategory = 'club' | 'concert' | 'culture' | 'festival' | 'food' | 'film' | 'art' | 'sports' | 'market';

export interface PsstEvent {
  id: string;
  title: string;
  date: ISODate;
  endDate?: ISODate | null;
  venue: string;
  address: string;
  hood: string;
  lat: number;
  lng: number;
  category: EventCategory;
  price?: string;
  url?: string;
  why?: string;
  energy?: number;
  sources: string[];
  time?: HHMM; // show or start time
  doors?: HHMM;
  verifiedOn?: ISODate;
  getThere?: string;
  bring?: string;
  after?: string;
}

export interface Hotel {
  id: string;
  name: string;
  hood: string;
  address: string;
  lat: number;
  lng: number;
  tier: 1 | 2 | 3 | 4;
  price: string;
  theMove: string;
  why: string;
  perks?: string[];
  word: string;
  url: string;
  sources?: string[];
  verifiedOn?: ISODate;
  nightly?: number; // Nov 20 to 24 average, resort fee included when feeIncluded
  feeIncluded?: boolean;
}

export interface ForecastDay { date: ISODate; code: number; hi: number; lo: number; rain: number; sunrise: HHMM; sunset: HHMM; uv: number }
/** [temperature °F, chance of rain %, weather code] for each hour */
export type HourCell = [number, number, number];
export interface WeatherData {
  fetched: ISODate;
  days: ForecastDay[];
  hourly: Record<ISODate, HourCell[]>;
  typical: Record<string, { hi: number; lo: number; wet: number }>; // 'MM-DD'
}
export type WeatherView =
  | { kind: 'forecast'; hi: number; lo: number; rain: number; sky: string; uv: number; hourly?: HourCell[] }
  | { kind: 'typical'; hi: number; lo: number; rain: number; sky: 'typical'; uv?: undefined; hourly?: undefined };

export interface Sun { rise: number; set: number; source: 'forecast' | 'calc' }
export interface LatLng { lat: number; lng: number }

export interface Ranked { m: Move; s: number; open: boolean; soon: number | null; sealed?: boolean }

export interface Slot {
  key: string;
  label: string;
  at: number; // hours from the day's midnight; 24+ is after midnight
  base?: number;
  target?: number;
  event?: PsstEvent;
  move?: Move;
  energy: number;
  options?: number;
}
export interface PlanDay { date: ISODate; dow: Dow; sun: Sun; weather: WeatherView | null; wet: boolean; slots: Slot[] }

/** What a sticker needs: a move, or an event or hotel dressed as one. */
export interface StickerSubject { id: string; hood?: string; category: string; word?: string; place: string }

export interface Geo {
  w: number; h: number; k: number;
  bbox: [number, number, number, number];
  land: number[][]; coast: number[][]; major: number[][]; primary: number[][]; secondary: number[][];
}
