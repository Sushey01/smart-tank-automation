import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getHealth } from '../../src/api/health';
import { Card, ErrorState, Screen, Skeleton } from '../../src/components/States';
import { errorMessage, formatWhen } from '../../src/lib/format';
import { useTheme } from '../../src/theme';

interface FailoverEvent {
  at: string;
  text: string;
}

export default function ClusterScreen() {
  const { colors } = useTheme();
  const [banner, setBanner] = useState<string | null>(null);
  const [events, setEvents] = useState<FailoverEvent[]>([]);
  const previous = useRef<string | null | undefined>(undefined);
  const health = useQuery({
    queryKey: ['health', 'cluster'],
    queryFn: getHealth,
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (!health.data) return;
    const primary = health.data.primary;
    if (previous.current !== undefined && previous.current !== primary && primary) {
      const at = new Date().toLocaleTimeString('en-GB');
      setBanner(`Failover detected: new primary ${primary} at ${at}`);
      setEvents((current) => [{ at, text: `${previous.current ?? 'none'} → ${primary}` }, ...current].slice(0, 12));
    }
    previous.current = primary;
  }, [health.data]);

  if (health.isLoading) {
    return (
      <Screen>
        <View style={styles.pad}><Skeleton height={140} /></View>
      </Screen>
    );
  }
  if (health.isError || !health.data) {
    return (
      <Screen>
        <View style={styles.pad}>
          <ErrorState message={health.isError ? errorMessage(health.error) : 'Replica set status unavailable'} onRetry={() => { void health.refetch(); }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.pad}>
        {banner && (
          <View style={[styles.banner, { borderColor: colors.warn, backgroundColor: colors.muted }]}>
            <Text style={{ color: colors.ink, flex: 1 }}>{banner}</Text>
            <Pressable onPress={() => setBanner(null)}>
              <Text style={{ color: colors.brandDark, fontWeight: '600' }}>Dismiss</Text>
            </Pressable>
          </View>
        )}
        <Text style={{ color: colors.inkMuted }}>
          Set {health.data.set} · checked {formatWhen(health.data.checkedAt)} · polling every 2 seconds
        </Text>
        {health.data.members.map((member) => (
          <Card key={member.name}>
            <Text style={[styles.mono, { color: colors.ink }]}>{member.name}</Text>
            <Text style={{ color: member.isPrimary ? colors.brandDark : colors.inkMuted, fontWeight: '700' }}>
              {member.state}{member.isPrimary ? ' · primary' : ''}
            </Text>
            <Text style={{ color: colors.inkMuted }}>Health {member.health === 1 ? 'up' : 'down'} ({member.health})</Text>
          </Card>
        ))}
        {events.length > 0 && (
          <Card>
            <Text style={[styles.heading, { color: colors.ink }]}>Primary changes</Text>
            {events.map((event) => (
              <Text key={`${event.at}-${event.text}`} style={{ color: colors.inkMuted }}>{event.at} · {event.text}</Text>
            ))}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, gap: 12, paddingBottom: 32 },
  banner: { borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: 'row', gap: 12, alignItems: 'center' },
  mono: { fontSize: 14 },
  heading: { fontSize: 17, fontWeight: '600' },
});
