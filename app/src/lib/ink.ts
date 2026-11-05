// A move's sticker ink: one Miami ink per move, picked by a hash of its id. The sticker prints in it,
// and the stub's tear-off is tinted with it, so the stub you keep matches its sticker in the Book.
export const INKS: readonly (readonly [string, string])[] = [['#E2406F', '#FEFAF1'], ['#4AC9EC', '#052739'], ['#733EA4', '#FEFAF1'], ['#FED252', '#052739'], ['#117555', '#FEFAF1'], ['#C8F56D', '#052739']];
export const inkHash = (s: string): number => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
export const inkOf = (id: string): readonly [string, string] => INKS[inkHash(id) % INKS.length];
