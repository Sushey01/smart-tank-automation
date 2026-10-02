import { File, Paths } from 'expo-file-system';

let ready: Promise<string> | null = null;

function buildWav() {
  const sampleRate = 22050;
  const duration = 0.9;
  const samples = Math.floor(sampleRate * duration);
  const dataSize = samples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  for (let index = 0; index < samples; index += 1) {
    const progress = index / samples;
    const frequency = progress < 0.5
      ? 520 + (880 - 520) * (progress / 0.5)
      : 880 - (880 - 520) * ((progress - 0.5) / 0.5);
    const sample = Math.sin(2 * Math.PI * frequency * (index / sampleRate)) * 0.25;
    view.setInt16(44 + index * 2, Math.round(sample * 32767), true);
  }
  return new Uint8Array(buffer);
}

export function sirenFileUri() {
  if (!ready) {
    ready = Promise.resolve().then(() => {
      const file = new File(Paths.cache, 'tank-siren.wav');
      if (!file.exists) file.create();
      file.write(buildWav());
      return file.uri;
    });
  }
  return ready;
}
