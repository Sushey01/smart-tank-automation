import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sirenFileUri } from '../lib/tone';
import { useTheme } from '../theme';

const STORAGE_KEY = 'tank-siren-armed';

export function SirenControl({ active }: { active: boolean }) {
  const { colors, dark, toggle } = useTheme();
  const [armed, setArmed] = useState(false);
  const [silenced, setSilenced] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === '1') setArmed(true);
    }).catch(() => {
      /* stay disarmed until the next tap */
    });
  }, []);

  useEffect(() => {
    if (!active) setSilenced(false);
  }, [active]);

  useEffect(() => {
    const playing = armed && active && !silenced;
    if (!playing) {
      Vibration.cancel();
      playerRef.current?.pause();
      return undefined;
    }

    let cancelled = false;
    Vibration.vibrate([0, 500, 250, 500], true);
    (async () => {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
        allowsRecording: false,
        shouldPlayInBackground: false,
      });
      const uri = await sirenFileUri();
      if (cancelled) return;
      if (!playerRef.current) {
        const player = createAudioPlayer({ uri });
        player.loop = true;
        player.volume = 0.7;
        playerRef.current = player;
      }
      playerRef.current.play();
    })().catch(() => {
      /* vibration still marks the alert if audio cannot start */
    });

    return () => {
      cancelled = true;
    };
  }, [active, armed, silenced]);

  useEffect(() => () => {
    Vibration.cancel();
    playerRef.current?.remove();
    playerRef.current = null;
  }, []);

  function arm() {
    setSilenced(false);
    setArmed(true);
    AsyncStorage.setItem(STORAGE_KEY, '1').catch(() => {
      /* armed for this session even if storage fails */
    });
  }

  function silence() {
    setSilenced(true);
    Vibration.cancel();
    playerRef.current?.pause();
  }

  return (
    <View style={styles.row}>
      {armed && active && !silenced ? (
        <Pressable onPress={silence} style={[styles.button, { backgroundColor: colors.danger }]}>
          <Text style={styles.buttonText}>Silence</Text>
        </Pressable>
      ) : (
        <Pressable onPress={arm} style={[styles.button, { backgroundColor: armed ? colors.brandDark : colors.muted, borderColor: colors.border, borderWidth: armed ? 0 : 1 }]}>
          <Text style={[styles.buttonText, { color: armed ? '#ffffff' : colors.ink }]}>Arm siren</Text>
        </Pressable>
      )}
      <Pressable onPress={toggle} accessibilityLabel={dark ? 'Switch to light theme' : 'Switch to dark theme'} style={[styles.button, { backgroundColor: colors.muted, borderColor: colors.border, borderWidth: 1 }]}>
        <Text style={[styles.buttonText, { color: colors.ink }]}>{dark ? 'Light' : 'Dark'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginRight: 8 },
  button: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  buttonText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
});
