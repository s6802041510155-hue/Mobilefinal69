import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, MISSION_DEFINITIONS } from '@/game/config/game';
import { NeonButton } from '@/components/NeonButton';
import { NeonPanel } from '@/components/NeonPanel';
import { SpaceBackdrop } from '@/components/SpaceBackdrop';
import { GameScreen } from '@/screens/GameScreen';
import { useTiltControl } from '@/hooks/useTiltControl';
import { GameStorage } from '@/storage/GameStorage';
import { feedback } from '@/services/feedback';
import { rocketAudio } from '@/services/audio';
import type { GameMode, GameRecord, GameResult, ScreenName, Settings, StoredProfile } from '@/types/game';

type Session = { id: number; mode: GameMode; missionId?: string; fallbackTouch: boolean };

export default function RocketRushApp() {
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [screen, setScreen] = useState<ScreenName>('splash');
  const [session, setSession] = useState<Session | null>(null);
  const [lastResult, setLastResult] = useState<GameRecord | null>(null);
  const settings = profile?.settings;
  const { getTilt, calibrate, sensorAvailable } = useTiltControl(Boolean(settings), settings ?? {
    soundEffects: true, backgroundMusic: true, vibration: true, sensitivity: 'medium', invertTilt: false, controlMode: 'tilt', calibration: 0,
  });

  useEffect(() => {
    void (async () => {
      const loaded = await GameStorage.load();
      setProfile(loaded);
      // Let the opening animation communicate that local saves/settings are ready.
      setTimeout(() => setScreen('main'), 1150);
    })();
  }, []);

  useEffect(() => {
    if (settings) rocketAudio.setMusicEnabled(settings.backgroundMusic);
  }, [settings?.backgroundMusic]);

  const navigate = (next: ScreenName) => {
    if (settings) feedback.tap(settings);
    setScreen(next);
  };
  const updateSettings = async (next: Settings) => {
    if (!profile) return;
    const saved = await GameStorage.updateSettings(profile, next);
    setProfile(saved);
  };
  const startGame = (mode: GameMode, missionId?: string) => {
    if (!profile) return;
    feedback.tap(profile.settings);
    setSession({ id: Date.now(), mode, missionId, fallbackTouch: profile.settings.controlMode === 'tilt' && !sensorAvailable });
    setScreen('game');
  };
  const finishGame = async (result: GameResult) => {
    if (!profile) return;
    const record = GameStorage.createRecord(result);
    const saved = await GameStorage.recordGame(profile, record);
    setProfile(saved);
    setLastResult(record);
    setScreen('gameover');
  };
  const activeSettings = useMemo(() => session?.fallbackTouch && settings ? { ...settings, controlMode: 'touch' as const } : settings, [session?.fallbackTouch, settings]);

  if (!profile || !settings) return <SplashScreen />;
  if (screen === 'game' && session && activeSettings) return (
    <GameScreen key={session.id} mode={session.mode} missionId={session.missionId} settings={activeSettings} getTilt={getTilt}
      onFinished={finishGame} onExit={() => navigate('main')}
      onSettingsChange={updateSettings} onCalibrate={() => updateSettings({ ...settings, calibration: calibrate() })}
      onFeedback={(event) => event === 'collect' ? feedback.collect(settings) : event === 'hit' ? feedback.hit(settings) : feedback.warning(settings)} />
  );
  if (screen === 'main') return <MainMenu profile={profile} onNavigate={navigate} />;
  if (screen === 'mode') return <ModeScreen onBack={() => navigate('main')} onStart={startGame} />;
  if (screen === 'tutorial') return <TutorialScreen onBack={() => navigate('main')} onStart={() => startGame('endless')} />;
  if (screen === 'missions') return <MissionsScreen profile={profile} onBack={() => navigate('main')} onStart={(id) => startGame('mission', id)} onClaim={async (id, reward) => setProfile(await GameStorage.claimMission(profile, id, reward))} />;
  if (screen === 'leaderboard') return <LeaderboardScreen profile={profile} onBack={() => navigate('main')} />;
  if (screen === 'settings') return <SettingsScreen settings={settings} sensorAvailable={sensorAvailable} onBack={() => navigate('main')} onChange={updateSettings} onCalibrate={() => updateSettings({ ...settings, calibration: calibrate() })} />;
  if (screen === 'gameover' && lastResult) return <GameOverScreen result={lastResult} records={profile.records} onPlayAgain={() => startGame(lastResult.mode, lastResult.missionId)} onMenu={() => navigate('main')} />;
  return <MainMenu profile={profile} onNavigate={navigate} />;
}

function SplashScreen() {
  const glow = useState(() => new Animated.Value(0.4))[0];
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0.4, duration: 500, useNativeDriver: true }),
    ]));
    animation.start(); return () => animation.stop();
  }, [glow]);
  return <SpaceBackdrop><SafeAreaView style={styles.splash}><Animated.Text style={[styles.splashRocket, { opacity: glow }]}>🚀</Animated.Text><Text style={styles.splashTitle}>ROCKET{`\n`}RUSH</Text><Text style={styles.splashSubtitle}>ASTEROID ESCAPE</Text><ActivityIndicator color={COLORS.cyan} size="large" /><Text style={styles.loading}>LOADING STELLAR SYSTEMS...</Text></SafeAreaView></SpaceBackdrop>;
}

function MainMenu({ profile, onNavigate }: { profile: StoredProfile; onNavigate: (screen: ScreenName) => void }) {
  return <SpaceBackdrop><SafeAreaView style={styles.safe}><View style={styles.mainContent}>
    <View style={styles.logoWrap}><Text style={styles.logoTop}>ROCKET</Text><Text style={styles.logoBottom}>RUSH</Text><Text style={styles.tagline}>ASTEROID ESCAPE</Text></View>
    <View style={styles.hero}><Text style={styles.planet}>🪐</Text><Text style={styles.heroRocket}>🚀</Text><Text style={styles.spark}>✦</Text></View>
    <View style={styles.menuButtons}>
      <NeonButton label="PLAY" icon="▶" variant="primary" onPress={() => onNavigate('mode')} style={styles.playButton} />
      <NeonButton label="MISSIONS" icon="◎" onPress={() => onNavigate('missions')} />
      <NeonButton label="LEADERBOARD" icon="♛" onPress={() => onNavigate('leaderboard')} />
      <NeonButton label="SETTINGS" icon="⚙" onPress={() => onNavigate('settings')} />
      <NeonButton label="HOW TO PLAY" icon="?" onPress={() => onNavigate('tutorial')} />
    </View>
    <Text style={styles.coinBank}>🟡 {profile.totalCoins} COINS  ·  {profile.totalGames} FLIGHTS</Text>
  </View></SafeAreaView></SpaceBackdrop>;
}

function ScreenShell({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return <SpaceBackdrop><SafeAreaView style={styles.safe}><View style={styles.header}><Pressable onPress={onBack} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable><Text style={styles.headerTitle}>{title}</Text><View style={styles.headerSpacer} /></View><ScrollView contentContainerStyle={styles.scroll}>{children}</ScrollView></SafeAreaView></SpaceBackdrop>;
}

function ModeScreen({ onBack, onStart }: { onBack: () => void; onStart: (mode: GameMode, missionId?: string) => void }) {
  return <ScreenShell title="SELECT MODE" onBack={onBack}>
    <Text style={styles.screenIntro}>CHOOSE YOUR FLIGHT</Text>
    <Pressable onPress={() => onStart('endless')}><NeonPanel style={[styles.modeCard, styles.endlessCard]}><Text style={styles.modeIcon}>∞</Text><View><Text style={styles.modeTitle}>ENDLESS SURVIVAL</Text><Text style={styles.modeDescription}>Go as far as you can. Every meter makes space more dangerous.</Text></View></NeonPanel></Pressable>
    <Pressable onPress={() => onStart('mission', 'travel-3000')}><NeonPanel style={styles.modeCard}><Text style={styles.modeIcon}>⚑</Text><View><Text style={styles.modeTitle}>MISSION CHALLENGE</Text><Text style={styles.modeDescription}>Choose missions, earn coin rewards, and become a master pilot.</Text></View></NeonPanel></Pressable>
    <Text style={styles.helpNote}>TIP: You can choose a specific mission on the Missions screen.</Text>
  </ScreenShell>;
}

function TutorialScreen({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  const [page, setPage] = useState(0);
  const pages = [
    { icon: '📱', title: 'TILT TO FLY', body: 'Tilt your phone left or right to steer. You can switch to Touch control in Settings.' },
    { icon: '☄️', title: 'SURVIVE THE FIELD', body: 'Avoid asteroids. A hit costs one heart, but you get 1.5 seconds of recovery time.' },
    { icon: '💎', title: 'COLLECT POWER', body: 'Crystals and coins add score. Fuel keeps you flying. Shield, boost, and magnet are stored power-ups.' },
  ];
  const item = pages[page];
  return <ScreenShell title="HOW TO PLAY" onBack={onBack}><NeonPanel style={styles.tutorialPanel}><Text style={styles.tutorialIcon}>{item.icon}</Text><Text style={styles.tutorialTitle}>{item.title}</Text><Text style={styles.tutorialBody}>{item.body}</Text><View style={styles.dots}>{pages.map((_, index) => <View key={index} style={[styles.dot, index === page && styles.dotActive]} />)}</View><View style={styles.rowButtons}>{page > 0 ? <NeonButton label="PREVIOUS" small onPress={() => setPage(page - 1)} /> : <View />}{page < pages.length - 1 ? <NeonButton label="NEXT" small variant="primary" onPress={() => setPage(page + 1)} /> : <NeonButton label="START GAME" small variant="primary" onPress={onStart} />}</View></NeonPanel><NeonPanel style={styles.legendPanel}><Legend icon="☄️" text="Asteroids damage your rocket" /><Legend icon="🔋" text="Fuel Cell restores 25% fuel" /><Legend icon="🛡️" text="Shield prevents one impact" /><Legend icon="⚡" text="Boost travels 50% faster for 5 seconds" /></NeonPanel></ScreenShell>;
}

function Legend({ icon, text }: { icon: string; text: string }) { return <View style={styles.legend}><Text style={styles.legendIcon}>{icon}</Text><Text style={styles.legendText}>{text}</Text></View>; }

function MissionsScreen({ profile, onBack, onStart, onClaim }: { profile: StoredProfile; onBack: () => void; onStart: (id: string) => void; onClaim: (id: string, reward: number) => void }) {
  return <ScreenShell title="MISSIONS" onBack={onBack}><Text style={styles.screenIntro}>COMPLETE CHALLENGES · EARN COINS</Text>{MISSION_DEFINITIONS.map((mission) => {
    const value = GameStorage.missionValue(profile, mission.id); const claimed = GameStorage.isClaimed(profile, mission.id); const complete = value >= mission.target; const progress = Math.min(100, value / mission.target * 100);
    return <NeonPanel key={mission.id} style={styles.missionCard}><View style={styles.missionTop}><Text style={styles.missionIcon}>{mission.icon}</Text><View style={styles.missionCopy}><Text style={styles.missionTitle}>{mission.title}</Text><Text style={styles.missionDescription}>{mission.description}</Text></View><Text style={styles.reward}>🟡 {mission.reward}</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View><View style={styles.missionFooter}><Text style={styles.progressText}>{Math.min(Math.floor(value), mission.target)} / {mission.target}</Text>{complete && !claimed ? <NeonButton small label="CLAIM" variant="gold" onPress={() => onClaim(mission.id, mission.reward)} /> : claimed ? <Text style={styles.claimed}>✓ CLAIMED</Text> : <NeonButton small label="PLAY" variant="primary" onPress={() => onStart(mission.id)} />}</View></NeonPanel>;
  })}</ScreenShell>;
}

function LeaderboardScreen({ profile, onBack }: { profile: StoredProfile; onBack: () => void }) {
  const rows = [...profile.records].sort((a, b) => b.score - a.score).slice(0, 10);
  return <ScreenShell title="LOCAL LEADERBOARD" onBack={onBack}><Text style={styles.screenIntro}>SCORES SAVED ON THIS DEVICE</Text><NeonPanel style={styles.leaderPanel}>{rows.length === 0 ? <View style={styles.emptyBoard}><Text style={styles.emptyIcon}>🏆</Text><Text style={styles.emptyTitle}>NO FLIGHTS YET</Text><Text style={styles.emptyText}>Finish a run to add your first local score.</Text></View> : rows.map((record, index) => <View key={record.id} style={[styles.leaderRow, index < 3 && styles.topRow]}><Text style={styles.rank}>{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}</Text><View style={styles.leaderDetail}><Text style={styles.leaderName}>FLIGHT {record.playedAt.slice(0, 10)}</Text><Text style={styles.leaderDistance}>{record.distance} m</Text></View><Text style={styles.leaderScore}>{record.score.toLocaleString()}</Text></View>)}</NeonPanel><Text style={styles.localOnly}>Local only — global rankings can be connected later without changing the game data model.</Text></ScreenShell>;
}

function SettingsScreen({ settings, sensorAvailable, onBack, onChange, onCalibrate }: { settings: Settings; sensorAvailable: boolean; onBack: () => void; onChange: (settings: Settings) => void; onCalibrate: () => void }) {
  const toggle = (key: 'soundEffects' | 'backgroundMusic' | 'vibration' | 'invertTilt') => onChange({ ...settings, [key]: !settings[key] });
  return <ScreenShell title="SETTINGS" onBack={onBack}><NeonPanel style={styles.settingsPanel}>
    <SettingToggle label="Sound Effects" value={settings.soundEffects} onChange={() => toggle('soundEffects')} />
    <SettingToggle label="Background Music" value={settings.backgroundMusic} onChange={() => toggle('backgroundMusic')} />
    <SettingToggle label="Vibration" value={settings.vibration} onChange={() => toggle('vibration')} />
    <SettingToggle label="Invert Tilt" value={settings.invertTilt} onChange={() => toggle('invertTilt')} />
    <Text style={styles.settingLabel}>TILT SENSITIVITY</Text><View style={styles.choiceRow}>{(['low', 'medium', 'high'] as const).map((value) => <Pressable key={value} onPress={() => onChange({ ...settings, sensitivity: value })} style={[styles.choice, settings.sensitivity === value && styles.choiceActive]}><Text style={styles.choiceText}>{value.toUpperCase()}</Text></Pressable>)}</View>
    <Text style={styles.settingLabel}>CONTROL MODE</Text><View style={styles.choiceRow}>{(['tilt', 'touch'] as const).map((value) => <Pressable key={value} onPress={() => onChange({ ...settings, controlMode: value })} style={[styles.choice, settings.controlMode === value && styles.choiceActive]}><Text style={styles.choiceText}>{value === 'tilt' ? 'TILT' : 'TOUCH'}</Text></Pressable>)}</View>
    <View style={styles.sensorStatus}><Text style={styles.sensorText}>{sensorAvailable ? '● Motion sensor detected' : '● Motion sensor unavailable — Touch mode will be used'}</Text></View>
    <NeonButton label="CALIBRATE SENSOR" icon="◎" onPress={() => { onCalibrate(); Alert.alert('Calibration saved', 'Hold your phone naturally in portrait orientation before starting your next flight.'); }} />
  </NeonPanel></ScreenShell>;
}

function SettingToggle({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) { return <View style={styles.toggleRow}><Text style={styles.toggleLabel}>{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{ false: '#24316c', true: '#5b54d9' }} thumbColor={value ? '#62eaff' : '#aab5da'} /></View>; }

function GameOverScreen({ result, records, onPlayAgain, onMenu }: { result: GameRecord; records: GameRecord[]; onPlayAgain: () => void; onMenu: () => void }) {
  const previousBest = Math.max(0, ...records.filter((record) => record.id !== result.id).map((record) => record.score));
  const highScore = result.score > previousBest;
  return <SpaceBackdrop><SafeAreaView style={styles.gameOverSafe}><Text style={styles.overTitle}>{result.missionCompleted ? 'MISSION\nCOMPLETE!' : 'GAME\nOVER'}</Text>{highScore ? <Text style={styles.newHigh}>★ NEW HIGH SCORE ★</Text> : null}<NeonPanel style={styles.resultPanel}><ResultLine label="DISTANCE" value={`${result.distance} m`} /><ResultLine label="SCORE" value={result.score.toLocaleString()} /><ResultLine label="CRYSTALS" value={`💎 ${result.crystals}`} /><ResultLine label="ASTEROIDS DODGED" value={String(result.asteroidsDodged)} /><ResultLine label="SURVIVAL" value={`${result.survivalTime}s`} /><View style={styles.endReason}><Text style={styles.endReasonText}>{result.endedBy === 'fuel' ? 'Out of fuel' : result.endedBy === 'mission' ? 'Mission objective reached' : 'Hull integrity depleted'}</Text></View></NeonPanel><View style={styles.gameOverButtons}><NeonButton label="PLAY AGAIN" icon="↻" variant="primary" onPress={onPlayAgain} /><NeonButton label="MAIN MENU" icon="⌂" onPress={onMenu} /></View></SafeAreaView></SpaceBackdrop>;
}

function ResultLine({ label, value }: { label: string; value: string }) { return <View style={styles.resultLine}><Text style={styles.resultLabel}>{label}</Text><Text style={styles.resultValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  safe: { flex: 1 }, splash: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 11 }, splashRocket: { fontSize: 62, textShadowColor: COLORS.cyan, textShadowRadius: 17 }, splashTitle: { color: '#fff', fontSize: 48, lineHeight: 42, fontWeight: '900', fontStyle: 'italic', textAlign: 'center', textShadowColor: COLORS.pink, textShadowRadius: 15 }, splashSubtitle: { color: COLORS.cyan, fontSize: 14, fontWeight: '900', letterSpacing: 4, marginBottom: 24 }, loading: { color: '#bbcaff', letterSpacing: 2, fontSize: 10, marginTop: 8 },
  mainContent: { flex: 1, alignItems: 'center', paddingHorizontal: 30, paddingTop: 30, paddingBottom: 16 }, logoWrap: { alignItems: 'center' }, logoTop: { color: '#a1efff', fontSize: 42, lineHeight: 40, fontWeight: '900', fontStyle: 'italic', letterSpacing: -2, textShadowColor: COLORS.blue, textShadowRadius: 11 }, logoBottom: { color: '#ff8cdd', fontSize: 55, lineHeight: 51, fontWeight: '900', fontStyle: 'italic', letterSpacing: -3, textShadowColor: COLORS.pink, textShadowRadius: 12 }, tagline: { color: '#72e9ff', fontWeight: '900', letterSpacing: 2.2, fontSize: 11, marginTop: 7 }, hero: { height: 192, width: '100%', position: 'relative', alignItems: 'center', justifyContent: 'center' }, planet: { position: 'absolute', left: 5, bottom: 22, fontSize: 65, opacity: 0.85 }, heroRocket: { fontSize: 110, transform: [{ rotate: '30deg' }], textShadowColor: COLORS.cyan, textShadowRadius: 20 }, spark: { position: 'absolute', right: 23, top: 35, color: '#fff', fontSize: 30, textShadowColor: COLORS.cyan, textShadowRadius: 15 }, menuButtons: { width: '100%', maxWidth: 340, gap: 10 }, playButton: { marginBottom: 3 }, coinBank: { marginTop: 'auto', color: '#ffe15a', fontWeight: '800', fontSize: 12, letterSpacing: 0.7 },
  header: { height: 70, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 42, height: 42, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#183889', borderWidth: 1.5, borderColor: COLORS.cyan }, backText: { color: '#fff', fontSize: 39, lineHeight: 38, marginTop: -7 }, headerTitle: { color: '#eaf8ff', fontSize: 22, fontWeight: '900', fontStyle: 'italic', textShadowColor: COLORS.cyan, textShadowRadius: 9 }, headerSpacer: { width: 42 }, scroll: { padding: 18, paddingTop: 8, paddingBottom: 42, gap: 14 }, screenIntro: { color: '#b4c7ff', fontSize: 11, textAlign: 'center', letterSpacing: 1.5, fontWeight: '800', marginBottom: 3 },
  modeCard: { minHeight: 151, flexDirection: 'row', alignItems: 'center', gap: 16 }, endlessCard: { borderColor: COLORS.yellow }, modeIcon: { color: COLORS.cyan, fontSize: 48, fontWeight: '900' }, modeTitle: { color: '#fff', fontSize: 21, fontWeight: '900', marginBottom: 6 }, modeDescription: { color: '#c8d5ff', fontSize: 13, lineHeight: 19, flexShrink: 1 }, helpNote: { color: '#a4b9ee', textAlign: 'center', fontSize: 12, marginTop: 3 },
  tutorialPanel: { alignItems: 'center', paddingVertical: 28, minHeight: 327 }, tutorialIcon: { fontSize: 76, marginBottom: 8 }, tutorialTitle: { color: COLORS.cyan, fontWeight: '900', fontSize: 24, letterSpacing: 1 }, tutorialBody: { color: '#e4eaff', lineHeight: 21, fontSize: 15, textAlign: 'center', marginTop: 16 }, dots: { flexDirection: 'row', gap: 8, marginVertical: 22 }, dot: { width: 8, height: 8, borderRadius: 6, backgroundColor: '#6b77b9' }, dotActive: { backgroundColor: COLORS.cyan, width: 23 }, rowButtons: { width: '100%', flexDirection: 'row', justifyContent: 'space-between' }, legendPanel: { gap: 8 }, legend: { flexDirection: 'row', gap: 13, alignItems: 'center' }, legendIcon: { fontSize: 24 }, legendText: { color: '#e6edff', fontSize: 13, flexShrink: 1 },
  missionCard: { gap: 13 }, missionTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, missionIcon: { fontSize: 34 }, missionCopy: { flex: 1 }, missionTitle: { color: '#fff', fontWeight: '900', fontSize: 16 }, missionDescription: { color: '#bcc9fa', fontSize: 12, marginTop: 2 }, reward: { color: COLORS.yellow, fontWeight: '900', fontSize: 12 }, progressTrack: { height: 10, backgroundColor: '#081442', borderRadius: 9, overflow: 'hidden', borderWidth: 1, borderColor: '#3656aa' }, progressFill: { height: '100%', backgroundColor: COLORS.cyan, borderRadius: 9 }, missionFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, progressText: { color: '#d9e4ff', fontSize: 12, fontWeight: '800' }, claimed: { color: '#6fffc8', fontSize: 12, fontWeight: '900' },
  leaderPanel: { padding: 9 }, emptyBoard: { alignItems: 'center', paddingVertical: 36, gap: 7 }, emptyIcon: { fontSize: 50 }, emptyTitle: { color: '#fff', fontWeight: '900', fontSize: 18 }, emptyText: { color: '#bac8f5', textAlign: 'center', fontSize: 13 }, leaderRow: { minHeight: 52, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: 'rgba(111, 137, 220, 0.28)' }, topRow: { backgroundColor: 'rgba(110, 63, 224, 0.18)' }, rank: { width: 44, color: '#f4f7ff', fontWeight: '900', fontSize: 16 }, leaderDetail: { flex: 1 }, leaderName: { color: '#f6f7ff', fontWeight: '800', fontSize: 12 }, leaderDistance: { color: '#afbef5', fontSize: 11, marginTop: 2 }, leaderScore: { color: COLORS.yellow, fontWeight: '900', fontSize: 17 }, localOnly: { color: '#b4c2f4', fontSize: 11, lineHeight: 16, textAlign: 'center' },
  settingsPanel: { gap: 9 }, toggleRow: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(123, 148, 230, 0.2)' }, toggleLabel: { color: '#fff', fontSize: 15, fontWeight: '700' }, settingLabel: { color: COLORS.cyan, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginTop: 10 }, choiceRow: { flexDirection: 'row', gap: 8 }, choice: { flex: 1, minHeight: 39, borderRadius: 12, backgroundColor: '#172365', borderWidth: 1, borderColor: '#4162b7', alignItems: 'center', justifyContent: 'center' }, choiceActive: { backgroundColor: '#4132b8', borderColor: COLORS.cyan, shadowColor: COLORS.cyan, shadowOpacity: 0.8, shadowRadius: 7 }, choiceText: { color: '#fff', fontSize: 11, fontWeight: '900' }, sensorStatus: { marginVertical: 6, padding: 10, backgroundColor: 'rgba(0, 212, 255, 0.1)', borderRadius: 12 }, sensorText: { color: '#8df6ff', fontSize: 12, textAlign: 'center', fontWeight: '700' },
  gameOverSafe: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 17 }, overTitle: { color: '#fa9eff', fontSize: 47, lineHeight: 43, fontWeight: '900', fontStyle: 'italic', textAlign: 'center', textShadowColor: COLORS.pink, textShadowRadius: 18 }, newHigh: { color: COLORS.yellow, fontSize: 13, fontWeight: '900', letterSpacing: 1.5 }, resultPanel: { width: '100%', maxWidth: 350, gap: 7, paddingVertical: 20 }, resultLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 5 }, resultLabel: { color: '#bdc9ff', fontSize: 11, fontWeight: '900', letterSpacing: 1 }, resultValue: { color: '#fff', fontSize: 22, fontWeight: '900' }, endReason: { marginTop: 7, backgroundColor: 'rgba(90, 55, 173, 0.45)', padding: 10, borderRadius: 10 }, endReasonText: { color: '#d3dcff', fontSize: 12, textAlign: 'center' }, gameOverButtons: { width: '100%', maxWidth: 350, gap: 10 },
});
