// Generates short sine-wave WAV tones used as placeholder track audio
// until real MP3s are added. Run with: node scripts/generate-placeholder-audio.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "audio");
mkdirSync(outDir, { recursive: true });

const SAMPLE_RATE = 44100;
const DURATION_SEC = 6;
// One tone per pitch, cycled across tracks so playback/seek/skip are testable.
const NOTES = [
  { name: "tone-1", freq: 261.63 }, // C4
  { name: "tone-2", freq: 293.66 }, // D4
  { name: "tone-3", freq: 329.63 }, // E4
  { name: "tone-4", freq: 349.23 }, // F4
  { name: "tone-5", freq: 392.0 }, // G4
  { name: "tone-6", freq: 440.0 }, // A4
];

function makeWav(freq) {
  const numSamples = SAMPLE_RATE * DURATION_SEC;
  const dataSize = numSamples * 2; // 16-bit mono
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  const fadeSamples = SAMPLE_RATE * 0.05;
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    let envelope = 1;
    if (i < fadeSamples) envelope = i / fadeSamples;
    else if (i > numSamples - fadeSamples) envelope = (numSamples - i) / fadeSamples;
    const sample = Math.sin(2 * Math.PI * freq * t) * envelope * 0.2;
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }
  return buffer;
}

for (const note of NOTES) {
  const wav = makeWav(note.freq);
  writeFileSync(path.join(outDir, `${note.name}.wav`), wav);
  console.log(`wrote ${note.name}.wav`);
}
