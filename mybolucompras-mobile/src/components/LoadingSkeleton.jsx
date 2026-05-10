import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

function SkeletonBox({ style }) {
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return <Animated.View style={[style, { opacity: anim }]} />;
}

export default function LoadingSkeleton() {
  const { dark } = useTheme();
  const bg = dark ? '#334155' : '#E2E8F0';

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} style={[styles.card, { backgroundColor: dark ? colors.surface.dark : colors.surface.light, borderColor: dark ? colors.border.dark : colors.border.light }]}>
          <View style={styles.left}>
            <SkeletonBox style={[styles.line, { width: '70%', backgroundColor: bg }]} />
            <SkeletonBox style={[styles.line, { width: '45%', marginTop: 8, backgroundColor: bg }]} />
          </View>
          <View style={styles.right}>
            <SkeletonBox style={[styles.line, { width: 70, backgroundColor: bg }]} />
            <SkeletonBox style={[styles.badge, { backgroundColor: bg }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4, marginHorizontal: spacing.md, marginVertical: spacing.xs, borderWidth: 1 },
  left: { flex: 1, marginRight: spacing.sm },
  right: { alignItems: 'flex-end' },
  line: { height: 14, borderRadius: radius.sm },
  badge: { height: 22, width: 50, borderRadius: radius.full, marginTop: 6 },
});
