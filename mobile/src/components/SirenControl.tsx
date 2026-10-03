import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../api/client';
import { useTheme } from '../theme';

const STORAGE_KEY = 'tank-siren-armed';
const SIREN_ASSET = require('../../assets/siren.wav');

export function SirenControl({ active }: { active: boolean }) {
  const { colors, dark, toggle } = useTheme();
  const [armed, setArmed] = useState(false);
  const [silenced, setSilenced] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);
  const webAudioCtxRef = useRef<any>(null);
  const webStopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === '1') setArmed(true);
    }).catch(() => {
      /* stay disarmed until next tap */
    });
  }, []);

  useEffect(() => {
    if (!active) setSilenced(false);
  }, [active]);

  async function getOrCreateNativePlayer(): Promise<AudioPlayer | null> {
    if (playerRef.current) return playerRef.current;

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
        allowsRecording: false,
        shouldPlayInBackground: false,
      });
    } catch (err) {
      console.warn('setAudioModeAsync warning:', err);
    }

    // Primary: Bundled local asset (reliable on iOS/Android native Expo Go)
    try {
      const player = createAudioPlayer(SIREN_ASSET);
      player.loop = true;
      player.volume = 1.0;
      playerRef.current = player;
      return player;
    } catch (errAsset) {
      console.warn('createAudioPlayer with local asset failed, trying remote URL:', errAsset);
    }

    // Secondary: Remote URL fallback from server
    try {
      const remoteUri = `${API_BASE_URL || 'http://192.168.1.73:3000'}/siren.wav`;
      const player = createAudioPlayer({ uri: remoteUri });
      player.loop = true;
      player.volume = 1.0;
      playerRef.current = player;
      return player;
    } catch (errRemote) {
      console.error('All native audio sources failed:', errRemote);
      return null;
    }
  }

  // Audio Playback handling (Platform-aware: Web Audio API on Web, expo-audio on Native)
  useEffect(() => {
    if (isTesting) return; // Do NOT interfere while a user manual test is playing

    const playing = armed && active && !silenced;
    if (!playing) {
      Vibration.cancel();
      if (Platform.OS === 'web') {
        webStopRef.current?.();
        webStopRef.current = null;
      } else {
        playerRef.current?.pause();
      }
      return undefined;
    }

    // Trigger haptic vibration pattern
    Vibration.vibrate([0, 500, 250, 500], true);

    // Web Platform (Chrome, Safari, Mobile Web)
    if (Platform.OS === 'web') {
      try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (Ctx) {
          if (!webAudioCtxRef.current) webAudioCtxRef.current = new Ctx();
          const ctx = webAudioCtxRef.current;
          void ctx.resume();

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
            const at = ctx.currentTime;
            osc.frequency.cancelScheduledValues(at);
            osc.frequency.setValueAtTime(520, at);
            osc.frequency.linearRampToValueAtTime(880, at + 0.45);
            osc.frequency.linearRampToValueAtTime(520, at + 0.9);
          }, 900);

          const stop = () => {
            window.clearInterval(sweep);
            gain.gain.cancelScheduledValues(ctx.currentTime);
            gain.gain.setValueAtTime(0.001, ctx.currentTime);
            try { osc.stop(); } catch {}
            osc.disconnect();
            gain.disconnect();
          };
          webStopRef.current = stop;
        }
      } catch (err) {
        console.error('Web audio playback error:', err);
      }
      return () => {
        webStopRef.current?.();
        webStopRef.current = null;
      };
    }

    // Native platform (iOS / Android Expo Go)
    let cancelled = false;
    getOrCreateNativePlayer().then((player) => {
      if (cancelled || !player) return;
      try {
        player.volume = 1.0;
        player.play();
      } catch (err) {
        console.error('Native audio play error:', err);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [active, armed, isTesting, silenced]);

  useEffect(() => () => {
    Vibration.cancel();
    webStopRef.current?.();
    webAudioCtxRef.current?.close?.();
    playerRef.current?.remove();
    playerRef.current = null;
  }, []);

  function unlockAudio() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (Ctx) {
          if (!webAudioCtxRef.current) webAudioCtxRef.current = new Ctx();
          const ctx = webAudioCtxRef.current;
          if (ctx.state === 'suspended') {
            void ctx.resume();
          }
          // Prime audio subsystem with 1-sample silent buffer
          const buffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
        }
      } catch {}
    }
  }

  function arm() {
    unlockAudio();
    setSilenced(false);
    setArmed(true);
    AsyncStorage.setItem(STORAGE_KEY, '1').catch(() => {});
  }

  function disarm() {
    setSilenced(false);
    setArmed(false);
    Vibration.cancel();
    if (Platform.OS === 'web') {
      webStopRef.current?.();
      webStopRef.current = null;
    } else {
      playerRef.current?.pause();
    }
    AsyncStorage.setItem(STORAGE_KEY, '0').catch(() => {});
  }

  function silence() {
    setSilenced(true);
    Vibration.cancel();
    if (Platform.OS === 'web') {
      webStopRef.current?.();
      webStopRef.current = null;
    } else {
      playerRef.current?.pause();
    }
  }

  function playTestSound() {
    setIsTesting(true);
    unlockAudio();
    Vibration.vibrate([0, 300, 100, 300]);

    if (Platform.OS === 'web') {
      try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (Ctx) {
          if (!webAudioCtxRef.current) webAudioCtxRef.current = new Ctx();
          const ctx = webAudioCtxRef.current;
          void ctx.resume();
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
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
          osc.start(now);
          osc.stop(now + 1.0);
        }
      } catch (err) {
        console.error('Test audio error:', err);
      }
      setTimeout(() => setIsTesting(false), 1200);
    } else {
      // Native test sound
      getOrCreateNativePlayer().then((player) => {
        if (!player) {
          setIsTesting(false);
          return;
        }
        try {
          player.volume = 1.0;
          player.play();
          setTimeout(() => {
            player.pause();
            setIsTesting(false);
          }, 1500);
        } catch (err) {
          console.error('Native test audio error:', err);
          setIsTesting(false);
        }
      });
    }
  }

  return (
    <View style={styles.row}>
      {armed && active && !silenced && (
        <Pressable onPress={silence} style={[styles.button, { backgroundColor: colors.danger }]}>
          <Text style={styles.buttonText}>Silence</Text>
        </Pressable>
      )}
      <Pressable
        onPress={armed ? disarm : arm}
        style={[
          styles.button,
          {
            backgroundColor: armed ? colors.brandDark : colors.muted,
            borderColor: colors.border,
            borderWidth: armed ? 0 : 1,
          },
        ]}
        accessibilityLabel={armed ? 'Turn siren off' : 'Turn siren on'}
      >
        <Text style={[styles.buttonText, { color: armed ? '#ffffff' : colors.ink }]}>
          {armed ? 'Siren on' : 'Siren off'}
        </Text>
      </Pressable>
      <Pressable
        onPress={playTestSound}
        style={[
          styles.button,
          {
            backgroundColor: colors.muted,
            borderColor: colors.border,
            borderWidth: 1,
            paddingHorizontal: 8,
          },
        ]}
        accessibilityLabel="Test audio buzzer"
      >
        <Text style={[styles.buttonText, { color: colors.ink }]}>🔊 Test</Text>
      </Pressable>
      <Pressable
        onPress={toggle}
        accessibilityLabel={dark ? 'Switch to light theme' : 'Switch to dark theme'}
        style={[
          styles.button,
          {
            backgroundColor: colors.muted,
            borderColor: colors.border,
            borderWidth: 1,
          },
        ]}
      >
        <Text style={[styles.buttonText, { color: colors.ink }]}>{dark ? 'Light' : 'Dark'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginRight: 8, alignItems: 'center' },
  button: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  buttonText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
});
