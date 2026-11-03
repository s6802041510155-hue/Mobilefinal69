import { useCallback, useEffect, useRef, useState } from 'react';
import { Accelerometer, Gyroscope, type AccelerometerMeasurement, type GyroscopeMeasurement } from 'expo-sensors';
import type { Settings } from '@/types/game';

/**
 * Complementary filter: the accelerometer supplies the stable gravity angle and
 * the gyro supplies quick response. The gyro is never treated as an angle alone.
 */
export function useTiltControl(enabled: boolean, settings: Settings) {
  const acceleration = useRef<AccelerometerMeasurement>({ x: 0, y: 0, z: 0, timestamp: 0 });
  const gyro = useRef<GyroscopeMeasurement>({ x: 0, y: 0, z: 0, timestamp: 0 });
  const tilt = useRef(0);
  const rawTilt = useRef(0);
  const lastSample = useRef(Date.now());
  const [sensorAvailable, setSensorAvailable] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let accelerometerSubscription: ReturnType<typeof Accelerometer.addListener> | undefined;
    let gyroSubscription: ReturnType<typeof Gyroscope.addListener> | undefined;
    let alive = true;
    void (async () => {
      const [accelerometerOK, gyroOK] = await Promise.all([
        Accelerometer.isAvailableAsync(),
        Gyroscope.isAvailableAsync(),
      ]);
      if (!alive) return;
      // Accelerometer is required for a reliable gravity reference. A gyro on
      // its own only reports angular velocity and would drift, so report it as
      // unavailable and let the app select its touch-control fallback instead.
      setSensorAvailable(accelerometerOK);
      if (!accelerometerOK) return;
      Accelerometer.setUpdateInterval(33);
      Gyroscope.setUpdateInterval(33);
      accelerometerSubscription = Accelerometer.addListener((sample) => {
        const now = Date.now();
        const dt = Math.min(0.08, Math.max(0.01, (now - lastSample.current) / 1000));
        lastSample.current = now;
        acceleration.current = sample;
        // In portrait, x describes left/right gravity. Subtract the persisted neutral hold.
        const gravityTilt = sample.x - settings.calibration;
        const gyroPrediction = rawTilt.current + gyro.current.y * dt;
        rawTilt.current = gyroOK ? 0.94 * gyroPrediction + 0.06 * gravityTilt : gravityTilt;
        // Smooth sensor noise before handing it to the game loop.
        tilt.current = tilt.current * 0.8 + rawTilt.current * 0.2;
      });
      if (gyroOK) gyroSubscription = Gyroscope.addListener((sample) => { gyro.current = sample; });
    })();
    return () => {
      alive = false;
      accelerometerSubscription?.remove();
      gyroSubscription?.remove();
    };
  }, [enabled, settings.calibration]);

  const calibrate = useCallback(() => acceleration.current.x, []);
  const getTilt = useCallback(() => tilt.current, []);
  return { getTilt, calibrate, sensorAvailable };
}
