// Copy curated data into the app, falling back to samples while research runs.
import { existsSync, copyFileSync } from 'node:fs';
for (const name of ['moves', 'events', 'hotels']) {
  const src = `../data/${name}.json`, dst = `src/lib/${name}.json`;
  if (existsSync(src)) { copyFileSync(src, dst); console.log('synced', name); }
  else if (!existsSync(dst)) { copyFileSync(`src/lib/sample-${name}.json`, dst); console.log('sample', name); }
}
