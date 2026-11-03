import type { GameSnapshot, ItemKind, ObstacleKind, Settings } from '@/types/game';

export const COLORS = {
  cyan: '#57e9ff',
  blue: '#3677ff',
  purple: '#a95dff',
  pink: '#ff5dd6',
  yellow: '#ffe15a',
  panel: 'rgba(20, 28, 91, 0.86)',
  ink: '#edf5ff',
  danger: '#ff5171',
};

export const DEFAULT_SETTINGS: Settings = {
  soundEffects: true,
  backgroundMusic: true,
  vibration: true,
  sensitivity: 'medium',
  invertTilt: false,
  controlMode: 'tilt',
  calibration: 0,
};

export const EMPTY_SNAPSHOT: GameSnapshot = {
  entities: [], rocketX: 0.5, rocketVelocity: 0, hp: 3, fuel: 100, score: 0,
  distance: 0, crystals: 0, coins: 0, asteroidsDodged: 0, shieldCharges: 0,
  boostCharges: 0, shieldActive: false, boostLeft: 0, magnetLeft: 0, combo: 0,
  elapsed: 0, invulnerableLeft: 0,
};

export const OBSTACLE_META: Record<ObstacleKind, { emoji: string; label: string; size: number }> = {
  small: { emoji: '🪨', label: 'Small Asteroid', size: 34 },
  giant: { emoji: '🌑', label: 'Giant Asteroid', size: 68 },
  meteor: { emoji: '☄️', label: 'Fire Meteor', size: 48 },
  debris: { emoji: '🛰️', label: 'Space Debris', size: 42 },
};

export const ITEM_META: Record<ItemKind, { emoji: string; label: string; color: string }> = {
  fuel: { emoji: '🔋', label: 'Fuel Cell +25%', color: '#ffe15a' },
  crystal: { emoji: '💎', label: 'Crystal +100', color: '#55ecff' },
  coin: { emoji: '🟡', label: 'Coin +50', color: '#ffda4d' },
  repair: { emoji: '❤️‍🩹', label: 'Repair +1 HP', color: '#ff719d' },
  shield: { emoji: '🛡️', label: 'Shield', color: '#58dcff' },
  boost: { emoji: '⚡', label: 'Speed Boost', color: '#c875ff' },
  magnet: { emoji: '🧲', label: 'Magnet', color: '#ff82df' },
};

export function difficultyFor(distance: number) {
  if (distance >= 3000) return { name: 'SURVIVAL', speed: 1.85, spawn: 0.35 };
  if (distance >= 2000) return { name: 'EXTREME', speed: 1.55, spawn: 0.46 };
  if (distance >= 1000) return { name: 'HARD', speed: 1.3, spawn: 0.58 };
  if (distance >= 500) return { name: 'NORMAL', speed: 1.12, spawn: 0.7 };
  return { name: 'EASY', speed: 0.95, spawn: 0.85 };
}

export const MISSION_DEFINITIONS = [
  { id: 'travel-3000', title: 'Deep Space Run', description: 'Travel 3,000 meters', target: 3000, reward: 200, icon: '🚀', metric: 'distance' },
  { id: 'crystals-30', title: 'Crystal Hunter', description: 'Collect 30 Crystals', target: 30, reward: 150, icon: '💎', metric: 'crystals' },
  { id: 'shield-5', title: 'Safety First', description: 'Use Shield 5 times', target: 5, reward: 100, icon: '🛡️', metric: 'shields' },
  { id: 'dodge-100', title: 'Ace Pilot', description: 'Dodge 100 Asteroids', target: 100, reward: 175, icon: '🎯', metric: 'dodged' },
  { id: 'survive-300', title: 'Long Haul', description: 'Survive for 5 minutes', target: 300, reward: 250, icon: '⏱️', metric: 'survival' },
] as const;
