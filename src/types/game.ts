export type ControlMode = 'tilt' | 'touch';
export type Sensitivity = 'low' | 'medium' | 'high';
export type GameMode = 'endless' | 'mission';
export type ScreenName =
  | 'splash'
  | 'main'
  | 'mode'
  | 'tutorial'
  | 'game'
  | 'missions'
  | 'leaderboard'
  | 'settings'
  | 'gameover';

export type ItemKind = 'fuel' | 'crystal' | 'coin' | 'repair' | 'shield' | 'boost' | 'magnet';
export type ObstacleKind = 'small' | 'giant' | 'meteor' | 'debris';
export type EntityKind = ItemKind | ObstacleKind;

export interface GameEntity {
  id: number;
  kind: EntityKind;
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  rotation: number;
  nearMissed?: boolean;
}

export interface GameSnapshot {
  entities: GameEntity[];
  rocketX: number;
  rocketVelocity: number;
  hp: number;
  fuel: number;
  score: number;
  distance: number;
  crystals: number;
  coins: number;
  asteroidsDodged: number;
  shieldCharges: number;
  boostCharges: number;
  shieldActive: boolean;
  boostLeft: number;
  magnetLeft: number;
  combo: number;
  elapsed: number;
  invulnerableLeft: number;
}

export interface GameResult {
  score: number;
  distance: number;
  crystals: number;
  coins: number;
  asteroidsDodged: number;
  shieldsUsed: number;
  survivalTime: number;
  mode: GameMode;
  missionId?: string;
  missionCompleted?: boolean;
  endedBy: 'hp' | 'fuel' | 'mission';
}

export interface Settings {
  soundEffects: boolean;
  backgroundMusic: boolean;
  vibration: boolean;
  sensitivity: Sensitivity;
  invertTilt: boolean;
  controlMode: ControlMode;
  calibration: number;
}

export interface GameRecord extends GameResult {
  id: string;
  playedAt: string;
}

export interface MissionProgress {
  missionId: string;
  value: number;
  claimed: boolean;
}

export interface StoredProfile {
  settings: Settings;
  records: GameRecord[];
  missions: MissionProgress[];
  totalCoins: number;
  totalCrystals: number;
  totalGames: number;
  totalShieldsUsed: number;
  totalAsteroidsDodged: number;
  longestSurvival: number;
}
