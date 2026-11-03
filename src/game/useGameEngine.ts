import { useCallback, useEffect, useRef, useState } from 'react';
import { difficultyFor, EMPTY_SNAPSHOT, ITEM_META, MISSION_DEFINITIONS, OBSTACLE_META } from '@/game/config/game';
import type { EntityKind, GameEntity, GameMode, GameResult, GameSnapshot, ItemKind, ObstacleKind, Settings } from '@/types/game';

type EngineOptions = {
  width: number;
  height: number;
  mode: GameMode;
  missionId?: string;
  settings: Settings;
  getTilt: () => number;
  onGameOver: (result: GameResult) => void;
  onEvent: (event: 'collect' | 'hit' | 'warning') => void;
};

const itemKinds: ItemKind[] = ['fuel', 'crystal', 'coin', 'repair', 'shield', 'boost', 'magnet'];
const obstacleKinds: ObstacleKind[] = ['small', 'giant', 'meteor', 'debris'];
const isItem = (kind: EntityKind): kind is ItemKind => itemKinds.includes(kind as ItemKind);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function useGameEngine(options: EngineOptions) {
  const { width, height, mode, missionId, settings, getTilt, onGameOver, onEvent } = options;
  const model = useRef<GameSnapshot>({ ...EMPTY_SNAPSHOT });
  const modelDirty = useRef(true);
  const paused = useRef(false);
  const ended = useRef(false);
  const nextId = useRef(0);
  const spawnClock = useRef(0.8);
  const touchTarget = useRef<number | null>(null);
  const lastFrame = useRef(0);
  const shieldsUsed = useRef(0);
  const [snapshot, setSnapshot] = useState<GameSnapshot>({ ...EMPTY_SNAPSHOT });
  const [isPaused, setIsPaused] = useState(false);
  const callback = useRef({ onGameOver, onEvent });
  callback.current = { onGameOver, onEvent };

  const publish = useCallback(() => {
    if (!modelDirty.current) return;
    setSnapshot({ ...model.current, entities: [...model.current.entities] });
    modelDirty.current = false;
  }, []);

  const reset = useCallback(() => {
    model.current = { ...EMPTY_SNAPSHOT };
    modelDirty.current = true;
    nextId.current = 0;
    spawnClock.current = 0.45;
    shieldsUsed.current = 0;
    paused.current = false;
    ended.current = false;
    lastFrame.current = 0;
    setIsPaused(false);
    publish();
  }, [publish]);

  const setPaused = useCallback((value: boolean) => {
    paused.current = value;
    lastFrame.current = 0;
    setIsPaused(value);
  }, []);

  const activateShield = useCallback(() => {
    const state = model.current;
    if (!paused.current && !ended.current && state.shieldCharges > 0 && !state.shieldActive) {
      state.shieldCharges -= 1;
      state.shieldActive = true;
      shieldsUsed.current += 1;
      modelDirty.current = true;
    }
  }, []);

  const activateBoost = useCallback(() => {
    const state = model.current;
    if (!paused.current && !ended.current && state.boostCharges > 0 && state.boostLeft <= 0) {
      state.boostCharges -= 1;
      state.boostLeft = 5;
      modelDirty.current = true;
    }
  }, []);

  const setTouchX = useCallback((x: number | null) => { touchTarget.current = x === null ? null : clamp(x / width, 0, 1); }, [width]);

  useEffect(() => {
    if (width < 100 || height < 200) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const spawn = (state: GameSnapshot) => {
      const difficulty = difficultyFor(state.distance);
      const wantItem = Math.random() > 0.72;
      const kind: EntityKind = wantItem
        ? itemKinds[Math.floor(Math.random() * itemKinds.length)]
        : obstacleKinds[Math.floor(Math.random() * obstacleKinds.length)];
      const obstacle = !isItem(kind);
      const size = obstacle ? OBSTACLE_META[kind].size : 33;
      const candidates = [0.12, 0.27, 0.42, 0.58, 0.73, 0.88];
      // Choose lanes with some separation from obstacles high on screen, preserving escape routes.
      const safe = candidates.filter((lane) => !state.entities.some((entity) => !isItem(entity.kind) && entity.y < height * 0.3 && Math.abs(entity.x - lane) < 0.16));
      const x = (safe.length ? safe : candidates)[Math.floor(Math.random() * (safe.length ? safe.length : candidates.length))] + (Math.random() - 0.5) * 0.04;
      state.entities.push({
        id: nextId.current++, kind, x: clamp(x, 0.06, 0.94), y: -size,
        size, speed: (obstacle ? 160 + Math.random() * 72 : 125 + Math.random() * 55) * difficulty.speed,
        drift: kind === 'debris' ? (Math.random() - 0.5) * 60 : kind === 'meteor' ? (Math.random() - 0.5) * 25 : 0,
        rotation: 0,
      });
    };
    const finish = (endedBy: GameResult['endedBy'], missionCompleted = false) => {
      if (ended.current) return;
      ended.current = true;
      const state = model.current;
      callback.current.onGameOver({
        score: Math.round(state.score), distance: Math.round(state.distance), crystals: state.crystals,
        coins: state.coins, asteroidsDodged: state.asteroidsDodged, shieldsUsed: shieldsUsed.current,
        survivalTime: Math.round(state.elapsed), mode, missionId, missionCompleted, endedBy,
      });
    };
    const frame = (timestamp: number) => {
      if (!lastFrame.current) lastFrame.current = timestamp;
      const dt = clamp((timestamp - lastFrame.current) / 1000, 0, 0.05);
      lastFrame.current = timestamp;
      if (!paused.current && !ended.current) {
        const state = model.current;
        const difficulty = difficultyFor(state.distance);
        state.elapsed += dt;
        const sensitivity = settings.sensitivity === 'high' ? 1.45 : settings.sensitivity === 'low' ? 0.7 : 1;
        const sensed = settings.controlMode === 'tilt' ? getTilt() : 0;
        const touchDelta = touchTarget.current === null ? 0 : (touchTarget.current - state.rocketX) * 2.6;
        const normalized = settings.controlMode === 'touch'
          ? clamp(touchDelta, -1, 1)
          : clamp((sensed * (settings.invertTilt ? -1 : 1)) / 0.45, -1, 1);
        const intent = normalized * 720 * sensitivity;
        // Inertia: velocity accelerates toward input, then damps naturally near neutral.
        state.rocketVelocity += (intent - state.rocketVelocity) * Math.min(1, dt * 7);
        if (Math.abs(normalized) < 0.055) state.rocketVelocity *= Math.max(0, 1 - dt * 4.5);
        state.rocketX = clamp(state.rocketX + state.rocketVelocity * dt / width, 0.075, 0.925);
        const boostFactor = state.boostLeft > 0 ? 1.5 : 1;
        state.boostLeft = Math.max(0, state.boostLeft - dt);
        state.magnetLeft = Math.max(0, state.magnetLeft - dt);
        state.invulnerableLeft = Math.max(0, state.invulnerableLeft - dt);
        const beforeDistance = state.distance;
        state.distance += 22 * difficulty.speed * boostFactor * dt;
        state.score += (Math.floor(state.distance / 10) - Math.floor(beforeDistance / 10)) * 10;
        state.fuel = Math.max(0, state.fuel - dt * (1 + (state.boostLeft > 0 ? 3 : 0)));
        if (state.fuel < 20 && Math.floor(state.elapsed * 1.25) !== Math.floor((state.elapsed - dt) * 1.25)) callback.current.onEvent('warning');
        spawnClock.current -= dt;
        if (spawnClock.current <= 0) {
          spawn(state);
          spawnClock.current = difficulty.spawn + Math.random() * 0.32;
        }
        // This coordinate is relative to the measured playfield, not the whole
        // device window. It matches the rocket's visual position in GameScreen.
        const rocketY = height - 82;
        const rocketXpx = state.rocketX * width;
        const next: GameEntity[] = [];
        for (const entity of state.entities) {
          entity.y += entity.speed * dt * boostFactor;
          entity.x = clamp(entity.x + entity.drift * dt / width, 0.045, 0.955);
          entity.rotation += (entity.kind === 'debris' ? 3.5 : 1.2) * dt;
          const xpx = entity.x * width;
          const dx = rocketXpx - xpx;
          const dy = rocketY - entity.y;
          const distance = Math.hypot(dx, dy);
          if (state.magnetLeft > 0 && isItem(entity.kind) && distance < 150) {
            entity.x += (state.rocketX - entity.x) * Math.min(1, dt * 5.5);
            entity.y += (rocketY - entity.y) * Math.min(1, dt * 5.5);
          }
          const collisionRadius = 20 + entity.size * 0.32;
          if (distance < collisionRadius) {
            if (isItem(entity.kind)) {
              if (entity.kind === 'fuel') state.fuel = Math.min(100, state.fuel + 25);
              if (entity.kind === 'crystal') { state.crystals += 1; state.score += 100; }
              if (entity.kind === 'coin') { state.coins += 1; state.score += 50; }
              if (entity.kind === 'repair') state.hp = Math.min(3, state.hp + 1);
              if (entity.kind === 'shield') state.shieldCharges += 1;
              if (entity.kind === 'boost') state.boostCharges += 1;
              if (entity.kind === 'magnet') state.magnetLeft = 8;
              callback.current.onEvent('collect');
              continue;
            }
            if (state.shieldActive) { state.shieldActive = false; callback.current.onEvent('collect'); continue; }
            if (state.invulnerableLeft <= 0) {
              state.hp -= 1;
              state.invulnerableLeft = 1.5;
              callback.current.onEvent('hit');
            }
            continue;
          }
          if (!isItem(entity.kind) && !entity.nearMissed && entity.y > rocketY - 14 && entity.y < rocketY + 40 && distance < collisionRadius + 35) {
            entity.nearMissed = true;
            state.combo = Math.min(8, state.combo + 1);
            state.score += 25 * state.combo;
          }
          if (entity.y < height + 90) next.push(entity);
          else if (!isItem(entity.kind)) state.asteroidsDodged += 1;
        }
        state.entities = next;
        const mission = MISSION_DEFINITIONS.find((definition) => definition.id === missionId);
        if (mode === 'mission' && mission) {
          const value = mission.metric === 'distance' ? state.distance : mission.metric === 'crystals' ? state.crystals : mission.metric === 'shields' ? shieldsUsed.current : mission.metric === 'dodged' ? state.asteroidsDodged : state.elapsed;
          if (value >= mission.target) finish('mission', true);
        }
        if (state.hp <= 0) finish('hp');
        else if (state.fuel <= 0) finish('fuel');
        modelDirty.current = true;
      }
      publish();
      timer = setTimeout(() => frame(Date.now()), 33);
    };
    timer = setTimeout(() => frame(Date.now()), 33);
    return () => { if (timer) clearTimeout(timer); };
  }, [getTilt, height, missionId, mode, publish, settings.controlMode, settings.invertTilt, settings.sensitivity, width]);

  return { snapshot, isPaused, setPaused, reset, activateShield, activateBoost, setTouchX };
}
