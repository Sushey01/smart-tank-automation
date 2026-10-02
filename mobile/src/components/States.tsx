import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, type Palette } from '../theme';

export function Screen({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.screen, { backgroundColor: colors.bg }]}>{children}</View>;
}

export function Card({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'brand';
}) {
  const { colors } = useTheme();
  const toneColor = {
    neutral: colors.ink,
    ok: colors.ok,
    warn: colors.warn,
    danger: colors.danger,
    brand: colors.onBrand,
  }[tone];
  const background = tone === 'brand' ? colors.brandDark : colors.muted;
  return (
    <View style={[styles.badge, { backgroundColor: background, borderColor: colors.border }]}>
      <Text style={[styles.badgeText, { color: toneColor }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  const { colors } = useTheme();
  return (
    <Card>
      <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.inkMuted }]}>{body}</Text>
    </Card>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <Card>
      <Text style={[styles.title, { color: colors.danger }]}>{message}</Text>
      <Pressable onPress={onRetry} style={[styles.button, { backgroundColor: colors.brandDark }]}>
        <Text style={styles.buttonText}>Retry</Text>
      </Pressable>
    </Card>
  );
}

export function Skeleton({ height = 88 }: { height?: number }) {
  const { colors } = useTheme();
  return <View style={[styles.skeleton, { height, backgroundColor: colors.muted }]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 14, lineHeight: 20 },
  button: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonText: { color: '#ffffff', fontWeight: '600' },
  skeleton: { borderRadius: 20 },
});

export function chipStyle(colors: Palette, selected: boolean) {
  return {
    borderColor: selected ? colors.brandDark : colors.border,
    backgroundColor: selected ? colors.brandDark : colors.muted,
  };
}
