import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS } from '@/game/config/game';
import type { GameRecord, MissionProgress, Settings, StoredProfile } from '@/types/game';
import { MISSION_DEFINITIONS } from '@/game/config/game';

const KEY = '@rocket-rush/profile-v1';

const initialProfile = (): StoredProfile => ({
  settings: DEFAULT_SETTINGS, records: [], missions: [], totalCoins: 0, totalCrystals: 0,
  totalGames: 0, totalShieldsUsed: 0, totalAsteroidsDodged: 0, longestSurvival: 0,
});

export const GameStorage = {
  async load(): Promise<StoredProfile> {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return initialProfile();
      const parsed = JSON.parse(raw) as Partial<StoredProfile>;
      return { ...initialProfile(), ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
    } catch { return initialProfile(); }
  },
  async save(profile: StoredProfile) { await AsyncStorage.setItem(KEY, JSON.stringify(profile)); },
  async updateSettings(profile: StoredProfile, settings: Settings) {
    const next = { ...profile, settings };
    await this.save(next);
    return next;
  },
  createRecord(result: Omit<GameRecord, 'id' | 'playedAt'>): GameRecord {
    return { ...result, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, playedAt: new Date().toISOString() };
  },
  missionValue(profile: StoredProfile, id: string) {
    return profile.missions.find((mission) => mission.missionId === id)?.value ?? 0;
  },
  isClaimed(profile: StoredProfile, id: string) {
    return profile.missions.find((mission) => mission.missionId === id)?.claimed ?? false;
  },
  async claimMission(profile: StoredProfile, id: string, reward: number) {
    const existing = profile.missions.find((mission) => mission.missionId === id);
    if (existing?.claimed) return profile;
    const missions: MissionProgress[] = existing
      ? profile.missions.map((mission) => mission.missionId === id ? { ...mission, claimed: true } : mission)
      : [...profile.missions, { missionId: id, value: 0, claimed: true }];
    const next = { ...profile, missions, totalCoins: profile.totalCoins + reward };
    await this.save(next);
    return next;
  },
  async recordGame(profile: StoredProfile, record: GameRecord) {
    const metricValue: Record<string, number> = {
      distance: record.distance,
      crystals: record.crystals,
      shields: record.shieldsUsed,
      dodged: record.asteroidsDodged,
      survival: record.survivalTime,
    };
    const missions = MISSION_DEFINITIONS.map((definition) => {
      const current = profile.missions.find((mission) => mission.missionId === definition.id);
      const progress = (current?.value ?? 0) + metricValue[definition.metric];
      return { missionId: definition.id, value: progress, claimed: current?.claimed ?? false };
    });
    const next: StoredProfile = {
      ...profile,
      records: [record, ...profile.records].slice(0, 30),
      missions,
      totalCoins: profile.totalCoins + record.coins,
      totalCrystals: profile.totalCrystals + record.crystals,
      totalGames: profile.totalGames + 1,
      totalShieldsUsed: profile.totalShieldsUsed + record.shieldsUsed,
      totalAsteroidsDodged: profile.totalAsteroidsDodged + record.asteroidsDodged,
      longestSurvival: Math.max(profile.longestSurvival, record.survivalTime),
    };
    await this.save(next);
    return next;
  },
};
