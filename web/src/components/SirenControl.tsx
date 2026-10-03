import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const STORAGE_KEY = 'tank-siren-armed';

function readArmed(): boolean {
  try {
    const val = window.localStorage.getItem(STORAGE_KEY);
    // Default to armed (true) unless explicitly disarmed with '0'
    return val === null ? true : val === '1';
  } catch {
    return true;
  }
}

export function SirenControl({ active }: { active: boolean }) {
  const [armed, setArmed] = useState(readArmed);
  const [silenced, setSilenced] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);

  const getAudioContext = useCallback(() => {
    if (!contextRef.current) {
      const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
      if (Ctx) {
        contextRef.current = new Ctx();
      }
    }
    if (contextRef.current && contextRef.current.state === 'suspended') {
      void contextRef.current.resume();
    }
    return contextRef.current;
  }, []);

  const stopSiren = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
    }
  }, []);

  const startSiren = useCallback(() => {
    stopSiren();

    // 1. HTML5 Audio element (/siren.wav)
    try {
      if (!audioElRef.current) {
        const el = new Audio('/siren.wav');
        el.loop = true;
        el.volume = 1.0;
        audioElRef.current = el;
      }
      audioElRef.current.currentTime = 0;
      void audioElRef.current.play().catch(() => {});
    } catch {}

    // 2. High-gain Web Audio oscillator sweep (520Hz <-> 880Hz at 0.35 gain)
    const ctx = getAudioContext();
    if (ctx) {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.35, now + 0.05);
        osc.frequency.setValueAtTime(520, now);
        osc.start();

        const sweep = window.setInterval(() => {
          if (!contextRef.current) return;
          const at = contextRef.current.currentTime;
          osc.frequency.cancelScheduledValues(at);
          osc.frequency.setValueAtTime(520, at);
          osc.frequency.linearRampToValueAtTime(880, at + 0.45);
          osc.frequency.linearRampToValueAtTime(520, at + 0.9);
        }, 900);

        stopRef.current = () => {
          window.clearInterval(sweep);
          try {
            gain.gain.cancelScheduledValues(ctx.currentTime);
            gain.gain.setValueAtTime(0.001, ctx.currentTime);
            osc.stop();
            osc.disconnect();
            gain.disconnect();
          } catch {}
        };
      } catch (err) {
        console.error('[siren] Web audio playback error:', err);
      }
    }
  }, [getAudioContext, stopSiren]);

  // Global user gesture listener: any click or keypress resumes context and starts alarm if active
  useEffect(() => {
    function unlock() {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        void ctx.resume();
      }
      if (armed && active && !silenced && !isTesting) {
        startSiren();
      }
    }

    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });

    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, [active, armed, getAudioContext, isTesting, silenced, startSiren]);

  useEffect(() => {
    if (!active) setSilenced(false);
  }, [active]);

  useEffect(() => {
    function handleExternalSilence() {
      stopSiren();
      setSilenced(true);
    }
    function handleExternalTest() {
      testSiren();
    }
    window.addEventListener('tank-siren-silence', handleExternalSilence);
    window.addEventListener('tank-siren-test', handleExternalTest);
    return () => {
      window.removeEventListener('tank-siren-silence', handleExternalSilence);
      window.removeEventListener('tank-siren-test', handleExternalTest);
    };
  }, [stopSiren]);

  // Main playback effect based on state changes (bypassed during manual testing)
  useEffect(() => {
    if (isTesting) return;

    const playing = armed && active && !silenced;
    if (playing) {
      startSiren();
    } else {
      stopSiren();
    }
    return () => {
      if (!isTesting) stopSiren();
    };
  }, [active, armed, isTesting, silenced, startSiren, stopSiren]);

  function arm() {
    getAudioContext();
    setArmed(true);
    setSilenced(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {}
    if (active && !isTesting) {
      startSiren();
    }
  }

  function silence() {
    stopSiren();
    setSilenced(true);
  }

  function disarm() {
    stopSiren();
    setArmed(false);
    setSilenced(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, '0');
    } catch {}
  }

  function testSiren() {
    setIsTesting(true);
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume();
    }

    // Play 1.5s HTML5 preview
    try {
      if (!testAudioRef.current) {
        testAudioRef.current = new Audio('/siren.wav');
      }
      testAudioRef.current.currentTime = 0;
      testAudioRef.current.volume = 1.0;
      testAudioRef.current.play().catch(() => {});
    } catch {}

    // Play 1.5s Web Audio synthesizer preview
    if (ctx) {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.35, now + 0.05);
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.4);
        osc.frequency.linearRampToValueAtTime(520, now + 0.8);
        osc.frequency.linearRampToValueAtTime(880, now + 1.2);
        gain.gain.setValueAtTime(0.35, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.45);
        osc.start(now);
        osc.stop(now + 1.5);
      } catch (err) {
        console.error('[siren] Test audio error:', err);
      }
    }

    setTimeout(() => {
      try {
        testAudioRef.current?.pause();
      } catch {}
      setIsTesting(false);
    }, 1500);
  }

  const sounding = armed && active && !silenced;

  return (
    <div className="flex items-center gap-1.5">
      {sounding && (
        <button
          type="button"
          onClick={silence}
          className="badge-danger cursor-pointer animate-pulse font-semibold"
          aria-pressed="true"
        >
          <VolumeX size={14} aria-hidden />
          Silence
        </button>
      )}
      <button
        type="button"
        onClick={armed ? disarm : arm}
        className={`${armed ? 'badge-ok font-medium' : 'badge'} cursor-pointer`}
        aria-pressed={armed}
        title={armed ? 'Siren is armed and will sound on alerts' : 'Siren is muted'}
      >
        <Volume2 size={14} aria-hidden />
        {armed ? 'Siren on' : 'Siren off'}
      </button>
      <button
        type="button"
        onClick={testSiren}
        className="badge cursor-pointer hover:bg-surface-border text-xs px-2 py-0.5"
        title="Click to test buzzer through your computer speakers"
      >
        🔊 Test
      </button>
    </div>
  );
}
