// gen-textures.mjs — optional. Generates ground textures with OpenAI gpt-image-2 and saves
// them to assets/textures/. The game auto-detects the PNGs and prefers them over the built-in
// procedural textures. Run from the repo root:
//
//   OPENAI_API_KEY=sk-... node scripts/gen-textures.mjs
//
// (This could not be run in the offline build environment; it is ready for the repo owner.)
import { writeFile, mkdir } from 'node:fs/promises';

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('Set OPENAI_API_KEY first.'); process.exit(1); }

const JOBS = [
  ['asphalt', 'Seamless tileable texture of sun-faded municipal parking lot asphalt, fine aggregate, subtle oil stains and hairline cracks, top-down, photorealistic, no markings, no objects, even lighting'],
  ['sand', 'Seamless tileable texture of light South Florida beach sand, top-down, photorealistic, soft ripples, even lighting, no objects'],
  ['water', 'Seamless tileable texture of shallow turquoise coastal seawater surface with gentle sparkle, top-down, photorealistic, even lighting'],
];

await mkdir('assets/textures', { recursive: true });
for (const [name, prompt] of JOBS) {
  process.stdout.write(`Generating ${name}... `);
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-2', prompt, size: '1024x1024', output_format: 'png' }),
  });
  if (!res.ok) { console.error(`\n${name} failed: ${res.status} ${await res.text()}`); continue; }
  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) { console.error(`\n${name}: no image in response`); continue; }
  await writeFile(`assets/textures/${name}.png`, Buffer.from(b64, 'base64'));
  console.log('saved.');
}
console.log('Done. Reload the game; it will pick these up automatically.');
