import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const audioRoot = path.join(__dirname, 'audio-assets');
const sections = ['actions', 'characters', 'emotions-melodies', 'scenes'];
const allowedExt = new Set(['.mp3', '.wav', '.ogg', '.flac', '.m4a']);

const manifest = {};

for (const section of sections) {
  const sectionPath = path.join(audioRoot, section);
  const entries = await readdir(sectionPath, { withFileTypes: true });

  manifest[section] = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => allowedExt.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
}

const outputPath = path.join(audioRoot, 'manifest.json');
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Wrote ${outputPath}`);
