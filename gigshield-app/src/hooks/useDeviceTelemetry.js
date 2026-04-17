import { useEffect, useRef } from 'react';

export function useDeviceTelemetry(intervalMs = 30000) {
    const varianceBuffer = useRef([]);

    useEffect(() => {
        // Accelerometer variance over 2-second window
        const handleMotion = (e) => {
            const z = e.accelerationIncludingGravity?.z ?? 0;
            varianceBuffer.current.push(z);
            if (varianceBuffer.current.length > 20) varianceBuffer.current.shift();
        };
        window.addEventListener('devicemotion', handleMotion);

        // Barometer
        let pressureObserver = null;
        if (typeof PressureObserver !== 'undefined') {
            pressureObserver = new window.PressureObserver((records) => {
                window._lastPressure = records.at(-1)?.value ?? null;
            });
            pressureObserver.observe('ambient-pressure');
        }

        const getVariance = (arr) => {
            if (!arr.length) return null;
            const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
            return arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
        };

        // Emulator/root detection heuristics
        const getRootIndicators = async () => {
            try {
                const perm = await navigator.permissions.query({ name: 'geolocation' });
                const ua = navigator.userAgent.toLowerCase();
                const suspiciousUA = ['sdk_gphone', 'android sdk', 'genymotion', 'bluestacks'].some(
                    (s) => ua.includes(s)
                );
                return {
                    mock_location_enabled: perm.state === 'granted' && suspiciousUA,
                    is_emulator: suspiciousUA,
                };
            } catch {
                return { mock_location_enabled: false, is_emulator: false };
            }
        };

        const sendTelemetry = async () => {
            const rootIndicators = await getRootIndicators();
            const payload = {
                accelerometer_variance: getVariance(varianceBuffer.current),
                barometric_pressure: window._lastPressure ?? null,
                ...rootIndicators,
            };

            try {
                await fetch('/api/telemetry/sensor', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            } catch (e) {
                console.warn("Sensor broadcast ignored:", e);
            }

        };

        const interval = setInterval(sendTelemetry, intervalMs);
        return () => {
            clearInterval(interval);
            window.removeEventListener('devicemotion', handleMotion);
            pressureObserver?.disconnect();
        };
    }, [intervalMs]);
}