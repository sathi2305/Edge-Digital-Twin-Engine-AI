import {
  BreachedMetric,
  MachinerySpec,
  SafetyBounds,
  TelemetryPoint,
  TwinSnapshot,
  TwinState,
} from '../types';

export function evaluateSafetyBounds(
  telemetry: TelemetryPoint,
  bounds?: SafetyBounds
): {
  isBreached: boolean;
  highestSeverity: 'nominal' | 'warning' | 'critical';
  breachedMetrics: BreachedMetric[];
} {
  if (!bounds) {
    return { isBreached: false, highestSeverity: 'nominal', breachedMetrics: [] };
  }

  const breachedMetrics: BreachedMetric[] = [];

  // 1. Evaluate Vibration Limits
  if (telemetry.physicalVibration >= bounds.vibrationCritical) {
    breachedMetrics.push({
      metric: 'vibration',
      label: 'Overall Vibration RMS',
      actualValue: telemetry.physicalVibration,
      thresholdValue: bounds.vibrationCritical,
      unit: 'mm/s',
      severity: 'critical',
    });
  } else if (telemetry.physicalVibration >= bounds.vibrationWarning) {
    breachedMetrics.push({
      metric: 'vibration',
      label: 'Overall Vibration RMS',
      actualValue: telemetry.physicalVibration,
      thresholdValue: bounds.vibrationWarning,
      unit: 'mm/s',
      severity: 'warning',
    });
  }

  // 2. Evaluate Temperature Limits
  if (telemetry.physicalTemp >= bounds.temperatureCritical) {
    breachedMetrics.push({
      metric: 'temperature',
      label: 'Core Operating Temp',
      actualValue: telemetry.physicalTemp,
      thresholdValue: bounds.temperatureCritical,
      unit: '°C',
      severity: 'critical',
    });
  } else if (telemetry.physicalTemp >= bounds.temperatureWarning) {
    breachedMetrics.push({
      metric: 'temperature',
      label: 'Core Operating Temp',
      actualValue: telemetry.physicalTemp,
      thresholdValue: bounds.temperatureWarning,
      unit: '°C',
      severity: 'warning',
    });
  }

  // 3. Evaluate Anomaly Confidence Limits
  if (telemetry.anomalyScore >= bounds.anomalyCritical) {
    breachedMetrics.push({
      metric: 'anomalyScore',
      label: 'Anomaly Confidence',
      actualValue: Math.round(telemetry.anomalyScore * 100),
      thresholdValue: Math.round(bounds.anomalyCritical * 100),
      unit: '%',
      severity: 'critical',
    });
  } else if (telemetry.anomalyScore >= bounds.anomalyWarning) {
    breachedMetrics.push({
      metric: 'anomalyScore',
      label: 'Anomaly Confidence',
      actualValue: Math.round(telemetry.anomalyScore * 100),
      thresholdValue: Math.round(bounds.anomalyWarning * 100),
      unit: '%',
      severity: 'warning',
    });
  }

  const isBreached = breachedMetrics.length > 0;
  const hasCritical = breachedMetrics.some((m) => m.severity === 'critical');
  const highestSeverity = hasCritical ? 'critical' : isBreached ? 'warning' : 'nominal';

  return { isBreached, highestSeverity, breachedMetrics };
}

export function createTwinSnapshot(
  telemetry: TelemetryPoint,
  spec: MachinerySpec,
  twinState: TwinState,
  triggerType: 'safety_bounds_breach' | 'manual',
  breachedMetrics: BreachedMetric[] = []
): TwinSnapshot {
  const timestamp = Date.now();
  const id = `snap_${timestamp}_${Math.random().toString(36).substring(2, 6)}`;
  const hasCritical = breachedMetrics.some((m) => m.severity === 'critical');
  const highestSeverity = hasCritical ? 'critical' : breachedMetrics.length > 0 ? 'warning' : 'nominal';

  const dateObj = new Date(timestamp);
  const timeFormatted = dateObj.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + `.${String(dateObj.getMilliseconds()).padStart(3, '0')}`;

  let summaryNote = '';
  if (triggerType === 'manual') {
    summaryNote = `Manual retrospective checkpoint captured by operator for ${spec.name}. Current twin fit accuracy is ${twinState.fitAccuracy.toFixed(1)}%.`;
  } else {
    const breachDescriptions = breachedMetrics.map(
      (m) => `${m.label} exceeded ${m.severity} threshold (${m.actualValue.toFixed(1)}${m.unit} > ${m.thresholdValue.toFixed(1)}${m.unit})`
    );
    summaryNote = `Safety Bound Exceedance Triggered: ${breachDescriptions.join('; ')}. Twin state generation #${twinState.generation} (v${twinState.version}) frozen for retrospective review.`;
  }

  return {
    id,
    timestamp,
    timeFormatted,
    machineryId: spec.id,
    machineryName: spec.name,
    triggerType,
    breachedMetrics,
    highestSeverity,
    twinState: {
      version: twinState.version,
      generation: twinState.generation,
      fitAccuracy: twinState.fitAccuracy,
      params: { ...twinState.params },
    },
    telemetry: { ...telemetry },
    componentsState: spec.components.map((c) => ({ ...c })),
    summaryNote,
  };
}

/**
 * Plays a subtle, non-intrusive dual-tone engineering snapshot sound using Web Audio API.
 * Safely fails silently if audio context is unavailable or suspended.
 */
export function playSnapshotSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.12);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174, now + 0.05); // D6
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.18);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.04);
    osc1.stop(now + 0.25);
    osc2.stop(now + 0.25);
  } catch {
    // Graceful no-op in restricted browser environments
  }
}
