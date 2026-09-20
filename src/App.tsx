import React, { useEffect, useRef, useState } from 'react';
import {
  AIAnalysisResponse,
  AnomalyConfig,
  FFTSpectrumPoint,
  MachinerySpec,
  MachineryType,
  OrbitPoint,
  PhysicalParameters,
  SubComponent,
  TelemetryPoint,
  TwinSnapshot,
  TwinState,
} from './types';
import { MACHINERY_SPECS } from './data/machinerySpecs';
import { PhysicsSimulationEngine } from './services/physicsEngine';
import { Header } from './components/Header';
import { MachineryCanvas } from './components/MachineryCanvas';
import { TelemetryCharts } from './components/TelemetryCharts';
import { TwinEvolutionPanel } from './components/TwinEvolutionPanel';
import { AnomalyInjector } from './components/AnomalyInjector';
import { PredictiveHealthPanel } from './components/PredictiveHealthPanel';
import { EdgeNodeTopology } from './components/EdgeNodeTopology';
import { SnapshotNotificationToast } from './components/SnapshotNotificationToast';
import { SnapshotRetrospectiveModal } from './components/SnapshotRetrospectiveModal';
import { evaluateSafetyBounds, createTwinSnapshot, playSnapshotSound } from './utils/safetyMonitor';
import { Sparkles, Activity, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [selectedType, setSelectedType] = useState<MachineryType>('centrifugal_pump');
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [isAnomalyModalOpen, setIsAnomalyModalOpen] = useState<boolean>(false);
  const [isEvolving, setIsEvolving] = useState<boolean>(false);

  const [anomalyConfig, setAnomalyConfig] = useState<AnomalyConfig>({
    type: 'none',
    severity: 0,
    rateOfChange: 1.0,
    description: 'Healthy Machine Operating State',
  });

  const currentSpec: MachinerySpec = MACHINERY_SPECS[selectedType];

  const [currentParams, setCurrentParams] = useState<PhysicalParameters>({ ...currentSpec.defaultParams });
  const [selectedComponent, setSelectedComponent] = useState<SubComponent | null>(currentSpec.components[0]);

  // Telemetry Buffers
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>([]);
  const [fftSpectrum, setFftSpectrum] = useState<FFTSpectrumPoint[]>([]);
  const [orbit, setOrbit] = useState<OrbitPoint[]>([]);

  // Self-Evolving Digital Twin State
  const [twinState, setTwinState] = useState<TwinState>({
    version: '1.0.0',
    generation: 0,
    fitAccuracy: 98.4,
    lastEvolvedTime: 'Just Now',
    params: { ...currentSpec.defaultParams },
    activeRuleTree: [
      { ruleId: 'r1', condition: 'IF residual_vibr > 0.8 mm/s', action: 'Trigger AI Physics Calibration', isActive: true },
      { ruleId: 'r2', condition: 'IF temp_delta > +15C', action: 'Update Thermal Dissipation k_th', isActive: true },
    ],
    history: [],
  });

  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);

  // Retrospective Twin State Snapshots
  const [snapshots, setSnapshots] = useState<TwinSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem('edge_twin_snapshots');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeSnapshotAlert, setActiveSnapshotAlert] = useState<TwinSnapshot | null>(null);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState<boolean>(false);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);

  // Cooldown tracking for automatic snapshot trigger (avoids flood during continuous critical state)
  const lastAutoSnapshotTimeRef = useRef<number>(0);
  const wasBreachedRef = useRef<boolean>(false);

  // References for live telemetry interval to access freshest state without re-creating interval
  const currentSpecRef = useRef<MachinerySpec>(currentSpec);
  currentSpecRef.current = currentSpec;

  const twinStateRef = useRef<TwinState>(twinState);
  twinStateRef.current = twinState;

  // Physics Engine Instance Reference
  const engineRef = useRef<PhysicsSimulationEngine | null>(null);

  // Initialize or update Physics Engine when machine type or anomaly changes
  useEffect(() => {
    const spec = MACHINERY_SPECS[selectedType];
    setCurrentParams({ ...spec.defaultParams });
    setSelectedComponent(spec.components[0]);

    setTwinState({
      version: '1.0.0',
      generation: 0,
      fitAccuracy: 98.4,
      lastEvolvedTime: 'Initial Baseline',
      params: { ...spec.defaultParams },
      activeRuleTree: [
        { ruleId: 'r1', condition: 'IF residual_vibr > 0.8 mm/s', action: 'Trigger AI Physics Calibration', isActive: true },
      ],
      history: [],
    });

    setAiAnalysis(null);
    setTelemetryHistory([]);

    engineRef.current = new PhysicsSimulationEngine(spec, anomalyConfig, spec.defaultParams);
  }, [selectedType]);

  // Update engine config when anomaly changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateConfig(currentSpec, anomalyConfig, currentParams);
    }
  }, [anomalyConfig, currentSpec, currentParams]);

  // Telemetry Tick Interval Loop with Safety Bounds Monitoring & Auto-Snapshot
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      if (!engineRef.current) return;

      const { telemetry, fftSpectrum: fft, orbit: orb } = engineRef.current.generateNextTick();

      setTelemetryHistory((prev) => {
        const updated = [...prev, telemetry];
        return updated.slice(-35); // Keep last 35 points
      });

      setFftSpectrum(fft);
      setOrbit(orb);

      // Evaluate Safety Bounds
      const spec = currentSpecRef.current;
      const { isBreached, breachedMetrics } = evaluateSafetyBounds(telemetry, spec.safetyBounds);

      const now = Date.now();
      const risingEdge = isBreached && !wasBreachedRef.current;
      const cooldownElapsed = isBreached && (now - lastAutoSnapshotTimeRef.current > 12000);

      // Trigger automatic snapshot on breach edge or after 12s cooldown if persistent
      if (isBreached && (risingEdge || cooldownElapsed)) {
        lastAutoSnapshotTimeRef.current = now;
        const newSnapshot = createTwinSnapshot(
          telemetry,
          spec,
          twinStateRef.current,
          'safety_bounds_breach',
          breachedMetrics
        );

        setSnapshots((prev) => {
          const updated = [newSnapshot, ...prev].slice(0, 60);
          try {
            localStorage.setItem('edge_twin_snapshots', JSON.stringify(updated));
          } catch {
            // ignore localStorage quota errors
          }
          return updated;
        });

        setActiveSnapshotAlert(newSnapshot);
        playSnapshotSound();
      }

      wasBreachedRef.current = isBreached;
    }, 200); // 5Hz UI stream

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Execute AI Digital Twin Self-Evolution Pass
  const handleTriggerSelfEvolution = async () => {
    if (isEvolving) return;
    setIsEvolving(true);

    try {
      const topFftPeaks = fftSpectrum
        .filter((item) => item.magnitude > 0.3)
        .slice(0, 8);

      const response = await fetch('/api/evolve-twin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineryName: currentSpec.name,
          machineryType: selectedType,
          anomalyConfig,
          recentTelemetry: telemetryHistory.slice(-10),
          fftPeaks: topFftPeaks,
          currentParams,
        }),
      });

      const data: AIAnalysisResponse = await response.json();

      if (data.success) {
        setAiAnalysis(data);

        // Update Learned Parameters
        const newParams = data.recommendedParams || currentParams;
        setCurrentParams(newParams);

        if (engineRef.current) {
          engineRef.current.setEvolvedParams(newParams);
        }

        const nextGen = twinState.generation + 1;
        const newVersion = `1.${nextGen}.0`;
        const newFitScore = data.fitScoreEstimate || 96.8;

        const paramMeta: Record<keyof PhysicalParameters, { label: string; unit: string }> = {
          dampingCoeff: { label: 'Damping (β)', unit: 'N·s/m' },
          bearingClearance: { label: 'Clearance (c)', unit: 'μm' },
          frictionCoeff: { label: 'Friction (μ)', unit: 'dim' },
          thermalDissipation: { label: 'Dissipation (k_th)', unit: 'W/K' },
          alignmentAngle: { label: 'Alignment (θ)', unit: 'deg' },
          unbalanceMass: { label: 'Unbalance (m_e)', unit: 'g·mm' },
          rotorStiffness: { label: 'Stiffness (k_r)', unit: 'kN/mm' },
        };

        const parameterChanges = (Object.keys(paramMeta) as (keyof PhysicalParameters)[]).map((key) => ({
          paramName: key,
          label: paramMeta[key].label,
          oldVal: currentParams[key],
          newVal: newParams[key] !== undefined ? newParams[key] : currentParams[key],
          unit: paramMeta[key].unit,
        }));

        // Record Evolution Event
        const newRecord = {
          id: `evo_${Date.now()}`,
          version: newVersion,
          generation: nextGen,
          params: { ...newParams },
          timestamp: new Date().toLocaleTimeString(),
          triggerReason: `Self-Evolution Pass: ${data.diagnosticSummary.slice(0, 90)}...`,
          prevFitScore: twinState.fitAccuracy,
          newFitScore,
          parameterChanges,
          equationUpdate: data.updatedEquationsLaTeX,
          rulHoursEstimate: data.rulHours,
          codeSnippetC: data.edgeCodeSnippetC,
          diagnosticNotes: data.diagnosticSummary,
        };

        setTwinState((prev) => ({
          ...prev,
          version: newVersion,
          generation: nextGen,
          fitAccuracy: newFitScore,
          lastEvolvedTime: 'Just Now',
          params: newParams,
          history: [newRecord, ...prev.history],
        }));
      }
    } catch (error) {
      console.error('Failed to evolve digital twin:', error);
    } finally {
      setIsEvolving(false);
    }
  };

  const latestTelemetry = telemetryHistory.length > 0 ? telemetryHistory[telemetryHistory.length - 1] : null;

  // Manual Snapshot Capture Handler
  const handleManualCapture = () => {
    if (!latestTelemetry) return;
    const newSnapshot = createTwinSnapshot(
      latestTelemetry,
      currentSpec,
      twinState,
      'manual'
    );

    setSnapshots((prev) => {
      const updated = [newSnapshot, ...prev].slice(0, 60);
      try {
        localStorage.setItem('edge_twin_snapshots', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setActiveSnapshotAlert(newSnapshot);
    playSnapshotSound();
  };

  // Review Snapshot Action (from toast notification or header)
  const handleReviewSnapshot = (snap: TwinSnapshot) => {
    setSelectedSnapshotId(snap.id);
    setIsSnapshotModalOpen(true);
    setActiveSnapshotAlert(null); // dismiss toast
  };

  // Restore Digital Twin parameters from a historical snapshot
  const handleRestoreTwinState = (params: PhysicalParameters, version: string, generation: number) => {
    setCurrentParams({ ...params });
    setTwinState((prev) => ({
      ...prev,
      params: { ...params },
      lastEvolvedTime: `Restored from v${version} (Gen #${generation})`,
    }));
    if (engineRef.current) {
      engineRef.current.updateConfig(currentSpec, anomalyConfig, params);
    }
  };

  const handleDeleteSnapshot = (id: string) => {
    setSnapshots((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      try {
        localStorage.setItem('edge_twin_snapshots', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (selectedSnapshotId === id) {
      setSelectedSnapshotId(null);
    }
  };

  const handleClearAllSnapshots = () => {
    setSnapshots([]);
    setSelectedSnapshotId(null);
    try {
      localStorage.removeItem('edge_twin_snapshots');
    } catch {}
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col">
      {/* Top Navigation Header */}
      <Header
        selectedType={selectedType}
        onSelectType={setSelectedType}
        isSimulating={isSimulating}
        onToggleSimulation={() => setIsSimulating((prev) => !prev)}
        onTriggerEvolution={handleTriggerSelfEvolution}
        isEvolving={isEvolving}
        onOpenAnomalyModal={() => setIsAnomalyModalOpen(true)}
        onOpenSnapshotModal={() => setIsSnapshotModalOpen(true)}
        snapshotCount={snapshots.length}
        twinVersion={twinState.version}
        evolutionCount={twinState.generation}
        fitAccuracy={twinState.fitAccuracy}
        hasActiveAnomaly={anomalyConfig.type !== 'none'}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        
        {/* Top Grid: Interactive Schematic & Real-Time Telemetry Processing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MachineryCanvas
            spec={currentSpec}
            telemetry={latestTelemetry}
            selectedComponent={selectedComponent}
            onSelectComponent={setSelectedComponent}
          />

          <TelemetryCharts
            telemetryHistory={telemetryHistory}
            fftSpectrum={fftSpectrum}
            orbit={orbit}
            fitAccuracy={twinState.fitAccuracy}
          />
        </div>

        {/* Middle Grid: Self-Evolving Twin State & Predictive Health RUL */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TwinEvolutionPanel
            twinState={twinState}
            nominalParams={currentSpec.defaultParams}
            currentParams={currentParams}
          />

          <PredictiveHealthPanel
            telemetry={latestTelemetry}
            anomalyConfig={anomalyConfig}
            aiAnalysis={aiAnalysis}
            isEvolving={isEvolving}
            onRunEvolution={handleTriggerSelfEvolution}
          />
        </div>

        {/* Bottom Section: Edge Node Hardware Topology & Data Pipeline */}
        <EdgeNodeTopology />

      </main>

      {/* Visual Alert 'Snapshot' Notification Toast */}
      <SnapshotNotificationToast
        snapshot={activeSnapshotAlert}
        onReviewSnapshot={handleReviewSnapshot}
        onDismiss={() => setActiveSnapshotAlert(null)}
      />

      {/* Retrospective Review Modal */}
      <SnapshotRetrospectiveModal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        snapshots={snapshots}
        selectedSnapshotId={selectedSnapshotId}
        onSelectSnapshot={setSelectedSnapshotId}
        onRestoreTwinState={handleRestoreTwinState}
        onDeleteSnapshot={handleDeleteSnapshot}
        onClearAllSnapshots={handleClearAllSnapshots}
        onManualCapture={handleManualCapture}
        currentSpec={currentSpec}
      />

      {/* Anomaly Injector Modal */}
      <AnomalyInjector
        isOpen={isAnomalyModalOpen}
        onClose={() => setIsAnomalyModalOpen(false)}
        config={anomalyConfig}
        onChangeConfig={setAnomalyConfig}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs font-mono text-slate-500">
        Edge-Native Self-Evolving Digital Twins for Industrial Machinery • Gemini 3.6 Flash Powered Physics Engine
      </footer>
    </div>
  );
}
