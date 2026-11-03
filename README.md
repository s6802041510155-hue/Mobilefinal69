# ROCKET RUSH: ASTEROID ESCAPE

An offline 2D portrait arcade game built for a Mobile Application Development mini project. Pilot a rocket through an asteroid field using phone tilt or touch control, collect power-ups, complete missions, and keep a local flight history.

## Features

- Real game loop with delta-time movement, difficulty scaling, object reuse/removal, collision circles, safe spawn lanes, invulnerability frames, near-miss combos, and pause/resume without a time jump.
- Four obstacle types: small asteroid, giant asteroid, fire meteor, and rotating space debris.
- Seven collectible types: fuel, crystal, coin, repair kit, shield, speed boost, and magnet.
- Touch fallback for simulator, web, and devices without usable motion sensors.
- Accelerometer + gyroscope complementary filter: accelerometer gravity provides stable tilt, gyro provides fast response; the gyro is not used as an angle by itself.
- Calibration, dead zone, smoothing, sensitivity, inversion, inertia, and boundary clamp.
- Local AsyncStorage profile for settings, records, best score, totals, and five mission progress records.
- Local-only leaderboard (no fabricated global scores), accessible UI screens, haptic feedback, and safe-area portrait layout.
- Offline sound feedback and looping space music generated as compact WAV files into the app cache on first launch; Sound Effects and Background Music settings control them independently.

## Install and run

```bash
npm install
npm run start
```

Then scan the QR code using Expo Go on Android/iOS, or run:

```bash
npm run android
npm run ios
```

The project targets Expo SDK 58 and uses the Expo-compatible package versions in `package.json`. If versions need aligning after an Expo upgrade, run:

```bash
npx expo install --fix
```

## Controls

- **Tilt**: hold the phone upright and use **Settings → Calibrate Sensor** while holding it naturally. Tilt left/right to accelerate sideways. Small movement is ignored by the dead zone.
- **Touch**: select **Touch** in Settings, then touch and drag horizontally in the playfield.
- **Shield**: collect a shield, then press the lower-left power button. It absorbs the next asteroid collision.
- **Boost**: collect a boost, then press the lower-right power button. It gives 50% more travel speed for 5 seconds and consumes extra fuel.

## Device-test checklist

1. Use a physical phone to check motion direction, calibration, and the desired sensitivity.
2. Switch to Touch in an emulator/web browser; the same game rules should work.
3. Verify haptics on the target device (OS battery-saver/device settings can suppress it).
4. Pause a run, wait, and resume: score, fuel, distance, spawn timer, and entities remain frozen while paused.
5. Finish runs and reopen the application: settings, missions, and the local leaderboard persist.

## Project map

```
app/                       Expo Router entry and app flow
src/components/            Reusable neon UI and animated space background
src/game/                  Game configuration and delta-time engine
src/hooks/useTiltControl   Sensor fusion and calibration source
src/screens/GameScreen     Playfield, HUD, pause controls
src/storage/GameStorage    AsyncStorage persistence boundary
src/services/feedback      Haptic feedback boundary
src/types/                 TypeScript game models
```

The data layer is deliberately separate from the UI. A future Firebase/global leaderboard can replace `GameStorage` without changing game screens or score calculation.
