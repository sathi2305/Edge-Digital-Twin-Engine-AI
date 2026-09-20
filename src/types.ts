export type MachineryType = 'centrifugal_pump' | 'cnc_spindle' | 'turbofan_engine' | 'conveyor_drive';

export interface PhysicalParameters {
  dampingCoeff: number;        // beta: N·s/m (e.g. 1.2)
  bearingClearance: number;    // c: micrometers (e.g. 25)
  frictionCoeff: number;       // mu: dimensionless (e.g. 0.08)
  thermalDissipation: number;  // k_th: W/K (e.g. 14.5)
  alignmentAngle: number;      // theta: degrees (e.g. 0.1)
  unbalanceMass: number;       // m_e: g·mm (e.g. 2.0)
  rotorStiffness: number;      // k_r: kN/mm (e.g. 45.0)
}

export interface SubComponent {
  id: string;
  name: string;
  status: 'optimal' | 'warning' | 'degraded' | 'critical';
  healthScore: number; // 0 - 100
  temperature: number; // Celsius
  vibrationRMS: number; // mm/s
  description: string;
}

export interface SafetyBounds {
  vibrationWarning: number;   // mm/s
  vibrationCritical: number;  // mm/s
  temperatureWarning: number; // Celsius
  temperatureCritical: number;// Celsius
  anomalyWarning: number;     // 0.0 to 1.0
  anomalyCritical: number;    // 0.0 to 1.0
}

export interface BreachedMetric {
  metric: 'vibration' | 'temperature' | 'anomalyScore';
  label: string;
  actualValue: number;
  thresholdValue: number;
  unit: string;
  severity: 'warning' | 'critical';
}

export interface TwinSnapshot {
  id: string;
  timestamp: number;
  timeFormatted: string;
  machineryId: MachineryType;
  machineryName: string;
  triggerType: 'safety_bounds_breach' | 'manual';
  breachedMetrics: BreachedMetric[];
  highestSeverity: 'warning' | 'critical' | 'nominal';
  twinState: {
    version: string;
    generation: number;
    fitAccuracy: number;
    params: PhysicalParameters;
  };
  telemetry: TelemetryPoint;
  componentsState: SubComponent[];
  summaryNote: string;
}

export interface MachinerySpec {
  id: MachineryType;
  name: string;
  category: string;
  nominalRPM: number;
  powerRating: string; // e.g. "75 kW"
  nominalTemp: number; // Celsius
  nominalVibration: number; // mm/s
  components: SubComponent[];
  defaultParams: PhysicalParameters;
  safetyBounds?: SafetyBounds;
  description: string;
}

export type AnomalyType = 
  | 'none' 
  | 'unbalance' 
  | 'bearing_outer_race' 
  | 'shaft_misalignment' 
  | 'lubrication_degradation' 
  | 'cavitation' 
  | 'thermal_runaway';

export interface AnomalyConfig {
  type: AnomalyType;
  severity: number; // 0 to 100%
  rateOfChange: number; // slow drift vs step change
  description: string;
}

export interface TelemetryPoint {
  timestamp: number;
  timeFormatted: string;
  physicalVibration: number;   // Simulated physical machinery sensor
  nominalTwinVibration: number; // Static baseline twin model
  evolvedTwinVibration: number; // Self-evolving adaptive model
  residualErrorNominal: number;
  residualErrorEvolved: number;
  physicalTemp: number;
  nominalTwinTemp: number;
  evolvedTwinTemp: number;
  rpm: number;
  powerkW: number;
  anomalyScore: number;        // 0 to 1.0
  status: 'normal' | 'warning' | 'critical';
}

export interface FFTSpectrumPoint {
  frequency: number; // Hz
  magnitude: number; // g RMS
  harmonicLabel?: string; // e.g. "1X RPM", "2X RPM", "BPFO"
}

export interface OrbitPoint {
  x: number; // mm displacement
  y: number; // mm displacement
}

export interface TwinEvolutionRecord {
  id: string;
  version: string;
  generation?: number;
  params?: PhysicalParameters;
  timestamp: string;
  triggerReason: string;
  prevFitScore: number;
  newFitScore: number;
  parameterChanges: {
    paramName: keyof PhysicalParameters;
    label: string;
    oldVal: number;
    newVal: number;
    unit: string;
  }[];
  equationUpdate: string;
  rulHoursEstimate: number;
  codeSnippetC: string;
  diagnosticNotes: string;
}

export interface TwinState {
  version: string;
  generation: number;
  fitAccuracy: number; // % match to physical sensors
  lastEvolvedTime: string;
  params: PhysicalParameters;
  activeRuleTree: {
    ruleId: string;
    condition: string;
    action: string;
    isActive: boolean;
  }[];
  history: TwinEvolutionRecord[];
}

export interface AIAnalysisRequest {
  machineryType: MachineryType;
  machineryName: string;
  currentTwinState: TwinState;
  anomalyConfig: AnomalyConfig;
  recentTelemetry: TelemetryPoint[];
  fftPeaks: { freq: number; mag: number; label?: string }[];
  currentParams: PhysicalParameters;
}

export interface AIAnalysisResponse {
  success: boolean;
  diagnosticSummary: string;
  rootCauseAnalysis: string;
  detectedFaultType: AnomalyType;
  recommendedParams: PhysicalParameters;
  fitScoreEstimate: number;
  rulHours: number;
  maintenanceUrgency: 'low' | 'medium' | 'high' | 'critical';
  updatedEquationsLaTeX: string;
  edgeRule: {
    condition: string;
    action: string;
  };
  edgeCodeSnippetC: string;
  recommendedWorkOrder: {
    title: string;
    actionItems: string[];
    sparesRequired: string[];
    estimatedHours: number;
  };
}
