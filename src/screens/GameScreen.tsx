import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, difficultyFor, ITEM_META, OBSTACLE_META } from '@/game/config/game';
import { NeonButton } from '@/components/NeonButton';
import { NeonPanel } from '@/components/NeonPanel';
import { SpaceBackdrop } from '@/components/SpaceBackdrop';
import { useGameEngine } from '@/game/useGameEngine';
import type { GameMode, GameResult, Settings } from '@/types/game';

type Props = {
  mode: GameMode;
  missionId?: string;
  settings: Settings;
  getTilt: () => number;
  onFinished: (result: GameResult) => void;
  onExit: () => void;
  onSettingsChange: (settings: Settings) => void;
  onCalibrate: () => void;
  onFeedback: (event: 'collect' | 'hit' | 'warning') => void;
};

export function GameScreen({ mode, missionId, settings, getTilt, onFinished, onExit, onSettingsChange, onCalibrate, onFeedback }: Props) {
  const { width, height } = useWindowDimensions();
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);
  // The HUD and power controls are outside the playfield. Measuring this area
  // keeps collision, spawning, and rendering in the same coordinate space on
  // every phone size and safe-area configuration.
  const [arenaSize, setArenaSize] = useState(() => ({ width, height: Math.max(300, height - 185) }));
  const onArenaLayout = useCallback((event: LayoutChangeEvent) => {
    const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
    setArenaSize((current) => current.width === nextWidth && current.height === nextHeight
      ? current
      : { width: nextWidth, height: nextHeight });
  }, []);
  const { snapshot, isPaused, setPaused, reset, activateShield, activateBoost, setTouchX } = useGameEngine({
    width: arenaSize.width, height: arenaSize.height, mode, missionId, settings, getTilt, onGameOver: onFinished, onEvent: onFeedback,
  });
  const onTouch = useCallback((event: { nativeEvent: { locationX: number } }) => {
    if (settings.controlMode === 'touch') setTouchX(event.nativeEvent.locationX);
  }, [setTouchX, settings.controlMode]);
  const fuelColor = snapshot.fuel <= 20 ? COLORS.danger : snapshot.fuel <= 45 ? COLORS.yellow : COLORS.cyan;
  const difficulty = difficultyFor(snapshot.distance);
  return (
    <SpaceBackdrop>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.hud} pointerEvents="box-none">
          <View style={styles.hudLeft}>
            <Text style={styles.hearts}>{'♥'.repeat(snapshot.hp)}<Text style={styles.emptyHearts}>{'♡'.repeat(3 - snapshot.hp)}</Text></Text>
            <View style={styles.fuelRow}><Text style={styles.fuelIcon}>⛽</Text><View style={styles.fuelTrack}><View style={[styles.fuelFill, { width: `${snapshot.fuel}%`, backgroundColor: fuelColor }]} /></View></View>
          </View>
          <View style={styles.scoreBox}><Text style={styles.hudLabel}>DISTANCE</Text><Text style={styles.hudValue}>{Math.floor(snapshot.distance)} m</Text><Text style={styles.hudLabel}>SCORE</Text><Text style={styles.hudValue}>{Math.floor(snapshot.score)}</Text></View>
          <Pressable onPress={() => setPaused(true)} style={styles.pause}><Text style={styles.pauseText}>Ⅱ</Text></Pressable>
        </View>
        <Pressable style={styles.arena} onLayout={onArenaLayout} onPressIn={onTouch} onPressOut={() => setTouchX(null)} onTouchMove={onTouch}>
          <Text style={styles.difficulty}>{difficulty.name}</Text>
          {snapshot.entities.map((entity) => {
            const meta = entity.kind in ITEM_META ? ITEM_META[entity.kind as keyof typeof ITEM_META] : OBSTACLE_META[entity.kind as keyof typeof OBSTACLE_META];
            return <Text key={entity.id} style={[styles.entity, { fontSize: entity.size, left: entity.x * arenaSize.width - entity.size / 2, top: entity.y, transform: [{ rotate: `${entity.rotation}rad` }] }]}>{meta.emoji}</Text>;
          })}
          {snapshot.magnetLeft > 0 ? <Text style={styles.effectText}>MAGNET {Math.ceil(snapshot.magnetLeft)}s</Text> : null}
          {snapshot.boostLeft > 0 ? <Text style={[styles.effectText, styles.boostText]}>BOOST {Math.ceil(snapshot.boostLeft)}s</Text> : null}
          {snapshot.shieldActive ? <View style={[styles.shieldBubble, { left: snapshot.rocketX * arenaSize.width - 34 }]} /> : null}
          <Text style={[styles.rocket, { left: snapshot.rocketX * arenaSize.width - 29, transform: [{ rotate: `${Math.max(-15, Math.min(15, snapshot.rocketVelocity / 24))}deg` }], opacity: snapshot.invulnerableLeft > 0 && Math.floor(snapshot.elapsed * 12) % 2 === 0 ? 0.45 : 1 }]}>🚀</Text>
          <Text style={[styles.flame, { left: snapshot.rocketX * arenaSize.width - 12, opacity: 0.55 + (Math.sin(snapshot.elapsed * 20) + 1) / 5 }]}>🔥</Text>
        </Pressable>
        <View style={styles.bottomControls} pointerEvents="box-none">
          <Pressable onPress={activateShield} style={[styles.powerButton, snapshot.shieldCharges === 0 && styles.powerDisabled]}><Text style={styles.powerIcon}>🛡️</Text><Text style={styles.counter}>{snapshot.shieldCharges}</Text></Pressable>
          <View style={styles.combo}><Text style={styles.comboLabel}>COMBO</Text><Text style={styles.comboValue}>×{Math.max(1, snapshot.combo)}</Text></View>
          <Pressable onPress={activateBoost} style={[styles.powerButton, snapshot.boostCharges === 0 && styles.powerDisabled]}><Text style={styles.powerIcon}>⚡</Text><Text style={styles.counter}>{snapshot.boostCharges}</Text></Pressable>
        </View>
        {isPaused ? <View style={styles.overlay}><NeonPanel style={styles.pausePanel}><Text style={styles.pauseSymbol}>Ⅱ</Text><Text style={styles.pausedTitle}>PAUSED</Text><NeonButton label="RESUME" icon="▶" variant="primary" onPress={() => setPaused(false)} /><NeonButton label="RESTART" icon="↻" onPress={reset} /><NeonButton label="SETTINGS" icon="⚙" onPress={() => setQuickSettingsOpen(true)} /><NeonButton label="MAIN MENU" icon="⌂" onPress={onExit} /></NeonPanel></View> : null}
        {quickSettingsOpen ? <View style={styles.quickOverlay}><NeonPanel style={styles.quickPanel}><Text style={styles.quickTitle}>QUICK SETTINGS</Text><QuickOption label={`SFX ${settings.soundEffects ? 'ON' : 'OFF'}`} onPress={() => onSettingsChange({ ...settings, soundEffects: !settings.soundEffects })} /><QuickOption label={`MUSIC ${settings.backgroundMusic ? 'ON' : 'OFF'}`} onPress={() => onSettingsChange({ ...settings, backgroundMusic: !settings.backgroundMusic })} /><QuickOption label={`VIBRATION ${settings.vibration ? 'ON' : 'OFF'}`} onPress={() => onSettingsChange({ ...settings, vibration: !settings.vibration })} /><QuickOption label={`CONTROL: ${settings.controlMode.toUpperCase()}`} onPress={() => onSettingsChange({ ...settings, controlMode: settings.controlMode === 'tilt' ? 'touch' : 'tilt' })} /><QuickOption label={`SENSITIVITY: ${settings.sensitivity.toUpperCase()}`} onPress={() => onSettingsChange({ ...settings, sensitivity: settings.sensitivity === 'low' ? 'medium' : settings.sensitivity === 'medium' ? 'high' : 'low' })} /><NeonButton label="CALIBRATE" small onPress={onCalibrate} /><NeonButton label="DONE" variant="primary" onPress={() => setQuickSettingsOpen(false)} /></NeonPanel></View> : null}
      </SafeAreaView>
    </SpaceBackdrop>
  );
}

function QuickOption({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable style={styles.quickOption} onPress={onPress}><Text style={styles.quickOptionText}>{label}</Text><Text style={styles.quickArrow}>›</Text></Pressable>; }

const styles = StyleSheet.create({
  safe: { flex: 1 },
  hud: { height: 110, paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', zIndex: 5 },
  hudLeft: { gap: 8 }, hearts: { color: '#ff5b7c', fontSize: 27, letterSpacing: 1, textShadowColor: '#ff5b7c', textShadowRadius: 8 }, emptyHearts: { color: '#53617f' },
  fuelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, fuelIcon: { fontSize: 19 }, fuelTrack: { width: 130, height: 15, borderRadius: 10, padding: 2, backgroundColor: '#07133e', borderWidth: 1, borderColor: '#5ce7ff' }, fuelFill: { height: '100%', borderRadius: 8 },
  scoreBox: { alignItems: 'flex-end', marginRight: 44 }, hudLabel: { color: '#ccd7ff', fontSize: 10, fontWeight: '800', letterSpacing: 1 }, hudValue: { color: '#fff', fontSize: 19, fontWeight: '900', marginBottom: 2 },
  pause: { position: 'absolute', right: 16, top: 12, width: 39, height: 39, borderRadius: 22, backgroundColor: '#1737a0', borderColor: '#5ceaff', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' }, pauseText: { fontSize: 22, color: '#fff', fontWeight: '900' },
  arena: { flex: 1 }, difficulty: { alignSelf: 'center', color: '#99efff', fontSize: 11, fontWeight: '900', letterSpacing: 2, opacity: 0.8 }, entity: { position: 'absolute', textAlign: 'center', textShadowColor: '#a95dff', textShadowRadius: 8 }, rocket: { position: 'absolute', bottom: 50, fontSize: 58, zIndex: 3, textShadowColor: '#58dcff', textShadowRadius: 14 }, flame: { position: 'absolute', bottom: 23, zIndex: 2, fontSize: 30 }, shieldBubble: { position: 'absolute', bottom: 36, width: 68, height: 68, zIndex: 1, borderRadius: 36, borderWidth: 3, borderColor: '#62eaff', backgroundColor: 'rgba(64, 207, 255, 0.22)', shadowColor: '#55e6ff', shadowRadius: 15, shadowOpacity: 1 },
  effectText: { position: 'absolute', top: 25, alignSelf: 'center', color: '#ff86e3', fontSize: 12, fontWeight: '900', letterSpacing: 1 }, boostText: { top: 42, color: '#ffe15a' },
  bottomControls: { paddingHorizontal: 17, paddingBottom: 8, minHeight: 75, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, powerButton: { width: 58, height: 58, borderRadius: 30, borderWidth: 2, borderColor: '#55e6ff', backgroundColor: 'rgba(18, 52, 160, 0.9)', alignItems: 'center', justifyContent: 'center', shadowColor: '#5ee8ff', shadowRadius: 10, shadowOpacity: 0.8 }, powerDisabled: { opacity: 0.45 }, powerIcon: { fontSize: 28 }, counter: { position: 'absolute', right: -4, bottom: -2, minWidth: 22, textAlign: 'center', overflow: 'hidden', borderRadius: 12, color: '#fff', backgroundColor: '#152368', fontWeight: '900', paddingVertical: 1 }, combo: { alignItems: 'center' }, comboLabel: { color: '#b8c7ff', fontSize: 10, fontWeight: '900' }, comboValue: { color: '#ffe15a', fontSize: 19, fontWeight: '900' },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(1, 4, 25, 0.72)', alignItems: 'center', justifyContent: 'center', padding: 35, zIndex: 20 }, pausePanel: { width: '100%', maxWidth: 320, alignItems: 'center', gap: 12, paddingVertical: 23 }, pauseSymbol: { color: '#dffaff', fontSize: 47, fontWeight: '900' }, pausedTitle: { color: '#fff', fontSize: 28, fontWeight: '900', fontStyle: 'italic', marginBottom: 6 },
  quickOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 30, backgroundColor: 'rgba(1, 4, 25, 0.89)', alignItems: 'center', justifyContent: 'center', padding: 28 }, quickPanel: { width: '100%', maxWidth: 340, gap: 8, paddingVertical: 20 }, quickTitle: { color: COLORS.cyan, textAlign: 'center', fontSize: 21, fontWeight: '900', marginBottom: 4 }, quickOption: { minHeight: 41, paddingHorizontal: 12, backgroundColor: 'rgba(39, 48, 131, 0.72)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(91, 218, 255, 0.44)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, quickOptionText: { color: '#f3f7ff', fontSize: 12, fontWeight: '900' }, quickArrow: { color: COLORS.cyan, fontSize: 24, lineHeight: 20 },
});
