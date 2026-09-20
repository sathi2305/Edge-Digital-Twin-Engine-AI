import {
  AnomalyConfig,
  FFTSpectrumPoint,
  MachinerySpec,
  OrbitPoint,
  PhysicalParameters,
  TelemetryPoint,
} from '../types';

export class PhysicsSimulationEngine {
  private spec: MachinerySpec;
  private anomaly: AnomalyConfig;
  private nominalParams: PhysicalParameters;
  private evolvedParams: PhysicalParameters;
  private stepCount: number = 0;
  private timeMs: number = Date.now();

  // Internal state variables for continuous differential equations
  private xDisplacement: number = 0;
  private yDisplacement: number = 0;
  private xVelocity: number = 0;
  private yVelocity: number = 0;
  private thermalAccumulator: number = 0;

  constructor(spec: MachinerySpec, anomaly: AnomalyConfig, evolvedParams?: PhysicalParameters) {
    this.spec = spec;
    this.anomaly = anomaly;
    this.nominalParams = { ...spec.defaultParams };
    this.evolvedParams = evolvedParams ? { ...evolvedParams } : { ...spec.defaultParams };
    this.thermalAccumulator = spec.nominalTemp;
  }

  public updateConfig(spec: MachinerySpec, anomaly: AnomalyConfig, evolvedParams?: PhysicalParameters) {
    this.spec = spec;
    this.anomaly = anomaly;
    this.nominalParams = { ...spec.defaultParams };
    if (evolvedParams) {
      this.evolvedParams = { ...evolvedParams };
    }
  }

  public setEvolvedParams(params: PhysicalParameters) {
    this.evolvedParams = { ...params };
  }

  /**
   * Generates a single tick step of telemetry data
   */
  public generateNextTick(): {
    telemetry: TelemetryPoint;
    fftSpectrum: FFTSpectrumPoint[];
    orbit: OrbitPoint[];
  } {
    this.stepCount++;
    this.timeMs += 100; // 100ms per tick (10Hz telemetry frequency)
    const t = this.stepCount * 0.1; // seconds
    const omega = (2 * Math.PI * this.spec.nominalRPM) / 60; // angular frequency rad/s

    const sev = this.anomaly.severity / 100; // 0.0 to 1.0

    // --- 1. Compute Physical Machine Behavior (With Anomaly Fault Impacts) ---
    let physicalUnbalance = this.nominalParams.unbalanceMass;
    let physicalClearance = this.nominalParams.bearingClearance;
    let physicalFriction = this.nominalParams.frictionCoeff;
    let physicalDamping = this.nominalParams.dampingCoeff;
    let physicalTempOffset = 0;
    let faultVibrationHarmonics = 0;

    switch (this.anomaly.type) {
      case 'unbalance':
        physicalUnbalance += sev * 12.0; // Massive rotor unbalance
        faultVibrationHarmonics += sev * 3.5 * Math.sin(omega * t);
        break;

      case 'bearing_outer_race':
        physicalClearance += sev * 40.0; // Pitting & looseness in bearing race
        // BPFO (Ball Pass Frequency Outer) is typically ~3.5x to 4.2x RPM
        const bpfoFreq = omega * 3.8;
        faultVibrationHarmonics += sev * 2.8 * Math.sin(bpfoFreq * t) * (1 + 0.5 * Math.sin(omega * t));
        physicalTempOffset += sev * 14;
        break;

      case 'shaft_misalignment':
        // Misalignment produces strong 2X and 3X RPM harmonics & axial force
        faultVibrationHarmonics += sev * 2.2 * Math.sin(2 * omega * t) + sev * 1.5 * Math.cos(3 * omega * t);
        physicalTempOffset += sev * 18;
        physicalFriction += sev * 0.08;
        break;

      case 'lubrication_degradation':
        physicalFriction += sev * 0.22; // High dry contact friction
        physicalDamping -= sev * 0.6; // Damping loss
        physicalTempOffset += sev * 32; // Major heat buildup
        faultVibrationHarmonics += sev * 1.8 * (Math.random() - 0.5); // Broadband high frequency acoustic noise
        break;

      case 'thermal_runaway':
        physicalTempOffset += sev * 55;
        physicalClearance -= sev * 15; // Thermal expansion pinching bearings
        physicalFriction += sev * 0.15;
        faultVibrationHarmonics += sev * 2.5 * Math.sin(omega * t * 1.05);
        break;

      case 'cavitation':
        // High frequency erratic fluid shockwaves
        faultVibrationHarmonics += sev * 4.2 * (Math.sin(7.3 * omega * t) + (Math.random() - 0.5) * 1.2);
        physicalTempOffset += sev * 8;
        break;

      case 'none':
      default:
        break;
    }

    // --- 2. Solve Rotor Mass-Spring-Damper Dynamic Equations ---
    // Physical machine vibration acceleration: a = F_unbalance / m - (beta/m)*v - (k/m)*x
    const dt = 0.01;
    const forceX = physicalUnbalance * omega * omega * Math.cos(omega * t) + faultVibrationHarmonics * 10;
    const forceY = physicalUnbalance * omega * omega * Math.sin(omega * t) + faultVibrationHarmonics * 8;

    const accelX = (forceX - physicalDamping * 15 * this.xVelocity - (this.nominalParams.rotorStiffness * 0.1) * this.xDisplacement);
    const accelY = (forceY - physicalDamping * 15 * this.yVelocity - (this.nominalParams.rotorStiffness * 0.1) * this.yDisplacement);

    this.xVelocity += accelX * dt;
    this.yVelocity += accelY * dt;
    this.xDisplacement += this.xVelocity * dt;
    this.yDisplacement += this.yVelocity * dt;

    // RMS Vibration magnitudes (mm/s)
    const noiseVal = (Math.random() - 0.5) * 0.15;
    const physicalVibration = Math.max(
      0.2,
      this.spec.nominalVibration + Math.abs(faultVibrationHarmonics) + Math.sqrt(this.xVelocity * this.xVelocity + this.yVelocity * this.yVelocity) * 0.08 + noiseVal
    );

    // --- 3. Compute Nominal Static Twin (Un-calibrated default equations) ---
    // The static twin ignores degradation drift, so its output remains ideal
    const nominalVibration = Math.max(0.1, this.spec.nominalVibration + 0.15 * Math.sin(omega * t) + (Math.random() - 0.5) * 0.05);
    const nominalTemp = this.spec.nominalTemp + 0.5 * Math.sin(t * 0.05);

    // --- 4. Compute Evolved Twin (Learned Parameters Model) ---
    // The Evolved Twin incorporates calibrated parameters (beta, clearance, friction, thermal dissipation)
    const evolvedDampingDelta = (physicalDamping - this.evolvedParams.dampingCoeff) * 0.5;
    const evolvedFrictionDelta = (physicalFriction - this.evolvedParams.frictionCoeff) * 2.0;

    // The evolved twin predicts the true physical state accurately!
    const evolvedVibration = Math.max(
      0.2,
      physicalVibration - evolvedDampingDelta * 0.2 + (Math.random() - 0.5) * 0.04
    );

    // Thermal balance equation: dT/dt = (Power * Friction) - HeatDissipation
    const targetTemp = this.spec.nominalTemp + physicalTempOffset + (physicalFriction * 180);
    this.thermalAccumulator += (targetTemp - this.thermalAccumulator) * 0.05;
    const physicalTemp = this.thermalAccumulator + (Math.random() - 0.5) * 0.3;

    const evolvedTemp = physicalTemp - (physicalFriction - this.evolvedParams.frictionCoeff) * 15;

    // --- 5. Residual Error Calculation ---
    const residualErrorNominal = Math.abs(physicalVibration - nominalVibration);
    const residualErrorEvolved = Math.abs(physicalVibration - evolvedVibration);

    // Anomaly score: higher when residual between physical and nominal twin expands!
    const anomalyScore = Math.min(1.0, Math.max(0.0, residualErrorNominal / 3.5 + (physicalTemp - this.spec.nominalTemp) / 50));

    let status: 'normal' | 'warning' | 'critical' = 'normal';
    if (anomalyScore > 0.65 || physicalVibration > 4.5 || physicalTemp > 95) {
      status = 'critical';
    } else if (anomalyScore > 0.35 || physicalVibration > 2.8 || physicalTemp > 75) {
      status = 'warning';
    }

    const timeFormatted = new Date(this.timeMs).toLocaleTimeString();

    const telemetry: TelemetryPoint = {
      timestamp: this.timeMs,
      timeFormatted,
      physicalVibration: Number(physicalVibration.toFixed(2)),
      nominalTwinVibration: Number(nominalVibration.toFixed(2)),
      evolvedTwinVibration: Number(evolvedVibration.toFixed(2)),
      residualErrorNominal: Number(residualErrorNominal.toFixed(2)),
      residualErrorEvolved: Number(residualErrorEvolved.toFixed(2)),
      physicalTemp: Number(physicalTemp.toFixed(1)),
      nominalTwinTemp: Number(nominalTemp.toFixed(1)),
      evolvedTwinTemp: Number(evolvedTemp.toFixed(1)),
      rpm: Math.round(this.spec.nominalRPM + (Math.random() - 0.5) * 8),
      powerkW: Number((parseFloat(this.spec.powerRating) * (1 + (physicalFriction - 0.05) * 0.8)).toFixed(1)),
      anomalyScore: Number(anomalyScore.toFixed(3)),
      status,
    };

    // --- 6. FFT Spectrum Generation ---
    const fundamentalHz = this.spec.nominalRPM / 60; // e.g. 2950 / 60 = 49.16 Hz
    const fftSpectrum: FFTSpectrumPoint[] = [];

    // Frequency spectrum bins from 0 to 500 Hz
    for (let f = 10; f <= 500; f += 10) {
      let mag = 0.02 + Math.random() * 0.02;

      // 1X Fundamental
      if (Math.abs(f - fundamentalHz) < 10) {
        mag += 0.8 + (this.anomaly.type === 'unbalance' ? sev * 2.5 : 0);
      }
      // 2X Harmonic
      else if (Math.abs(f - 2 * fundamentalHz) < 10) {
        mag += 0.3 + (this.anomaly.type === 'shaft_misalignment' ? sev * 2.8 : 0);
      }
      // 3X Harmonic
      else if (Math.abs(f - 3 * fundamentalHz) < 10) {
        mag += 0.15 + (this.anomaly.type === 'shaft_misalignment' ? sev * 1.6 : 0);
      }
      // Bearing BPFO Fault Harmonic (~3.8X RPM)
      else if (Math.abs(f - 3.8 * fundamentalHz) < 15) {
        if (this.anomaly.type === 'bearing_outer_race') {
          mag += sev * 3.2;
        }
      }
      // Broadband cavitation / lubrication friction noise (High freq)
      else if (f > 250 && (this.anomaly.type === 'lubrication_degradation' || this.anomaly.type === 'cavitation')) {
        mag += sev * 1.4 * (Math.random() + 0.3);
      }

      let label: string | undefined;
      if (Math.abs(f - fundamentalHz) < 10) label = '1X RPM';
      if (Math.abs(f - 2 * fundamentalHz) < 10) label = '2X RPM';
      if (Math.abs(f - 3.8 * fundamentalHz) < 15 && this.anomaly.type === 'bearing_outer_race') label = 'BPFO Bearing Defect';

      fftSpectrum.push({
        frequency: f,
        magnitude: Number(mag.toFixed(3)),
        harmonicLabel: label,
      });
    }

    // --- 7. Shaft Orbit / Lissajous Orbit Points ---
    const orbit: OrbitPoint[] = [];
    const pointsCount = 36;
    for (let i = 0; i < pointsCount; i++) {
      const angle = (i / pointsCount) * 2 * Math.PI;
      let orbitX = Math.cos(angle) * (1 + physicalUnbalance * 0.2);
      let orbitY = Math.sin(angle) * (1 + physicalClearance * 0.02);

      if (this.anomaly.type === 'shaft_misalignment') {
        // Misalignment distorts circular orbit into figure-8 or ellipse
        orbitY += 0.6 * sev * Math.sin(2 * angle);
      }

      orbit.push({
        x: Number(orbitX.toFixed(3)),
        y: Number(orbitY.toFixed(3)),
      });
    }

    return { telemetry, fftSpectrum, orbit };
  }
}
