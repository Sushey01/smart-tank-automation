import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const STORAGE_KEY = 'tank-siren-armed';

function readArmed() {
  return window.localStorage.getItem(STORAGE_KEY) === '1';
}

export function SirenControl({ active }: { active: boolean }) {
  const [armed, setArmed] = useState(readArmed);
  const [unlocked, setUnlocked] = useState(false);
  const [silenced, setSilenced] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!active) setSilenced(false);
  }, [active]);

  useEffect(() => {
    const playing = armed && unlocked && active && !silenced;
    if (!playing) {
      stopRef.current?.();
      stopRef.current = null;
      return undefined;
    }
    const ctx = contextRef.current;
    if (!ctx) return undefined;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.05);
    osc.frequency.setValueAtTime(520, now);
    osc.start();

    const sweep = window.setInterval(() => {
      const at = ctx.currentTime;
      osc.frequency.cancelScheduledValues(at);
      osc.frequency.setValueAtTime(520, at);
      osc.frequency.linearRampToValueAtTime(880, at + 0.45);
      osc.frequency.linearRampToValueAtTime(520, at + 0.9);
    }, 900);

    const stop = () => {
      window.clearInterval(sweep);
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      try {
        osc.stop();
      } catch {
        /* already stopped */
      }
      osc.disconnect();
      gain.disconnect();
    };
    stopRef.current = stop;
    return () => {
      stop();
      if (stopRef.current === stop) stopRef.current = null;
    };
  }, [active, armed, silenced, unlocked]);

  function arm() {
    const Ctx = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!contextRef.current) contextRef.current = new Ctx();
    void contextRef.current.resume();
    setArmed(true);
    setUnlocked(true);
    setSilenced(false);
    window.localStorage.setItem(STORAGE_KEY, '1');
  }

  function silence() {
    stopRef.current?.();
    setSilenced(true);
  }

  function disarm() {
    stopRef.current?.();
    setArmed(false);
    setUnlocked(false);
    setSilenced(false);
    window.localStorage.setItem(STORAGE_KEY, '0');
  }

  const sounding = armed && unlocked && active && !silenced;

  return (
    <div className="flex items-center gap-2">
      {sounding ? (
        <button type="button" onClick={silence} className="badge-danger" aria-pressed="true">
          <VolumeX size={14} aria-hidden />
          Silence
        </button>
      ) : (
        <button type="button" onClick={armed && unlocked ? disarm : arm} className={armed ? 'badge-warn' : 'badge'} aria-pressed={armed}>
          <Volume2 size={14} aria-hidden />
          {armed && unlocked ? 'Siren on' : 'Arm siren'}
        </button>
      )}
    </div>
  );
}
