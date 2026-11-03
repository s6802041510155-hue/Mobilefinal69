import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export function SpaceBackdrop({ children }: { children: React.ReactNode }) {
  const pulse = useRef(new Animated.Value(0.45)).current;
  const stars = useMemo(() => Array.from({ length: 54 }, (_, index) => ({
    id: index,
    left: `${(index * 47) % 101}%`, top: `${(index * 73) % 98}%`,
    size: index % 7 === 0 ? 4 : index % 3 === 0 ? 2 : 1,
    opacity: 0.22 + ((index * 13) % 68) / 100,
  })), []);
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 2200, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.35, duration: 2200, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse]);
  return (
    <LinearGradient colors={['#02061f', '#10155a', '#240c5d', '#070a32']} style={styles.fill}>
      <View pointerEvents="none" style={styles.nebulaOne} />
      <Animated.View pointerEvents="none" style={[styles.nebulaTwo, { opacity: pulse }]} />
      {stars.map((star) => <View key={star.id} pointerEvents="none" style={[styles.star, {
        left: star.left as `${number}%`, top: star.top as `${number}%`, width: star.size, height: star.size, opacity: star.opacity,
      }]} />)}
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
  star: { position: 'absolute', backgroundColor: '#d9f7ff', borderRadius: 10, shadowColor: '#61dfff', shadowOpacity: 1, shadowRadius: 5 },
  nebulaOne: { position: 'absolute', width: 390, height: 260, right: -120, top: 150, borderRadius: 250, backgroundColor: 'rgba(102, 28, 217, 0.32)', transform: [{ rotate: '-22deg' }] },
  nebulaTwo: { position: 'absolute', width: 310, height: 250, left: -150, bottom: 80, borderRadius: 220, backgroundColor: 'rgba(0, 173, 255, 0.20)' },
});
