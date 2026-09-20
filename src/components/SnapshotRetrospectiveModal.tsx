import React, { useState } from 'react';
import { MachinerySpec, PhysicalParameters, TwinSnapshot } from '../types';
import {
  Camera,
  X,
  AlertTriangle,
  AlertOctagon,
  RotateCcw,
  Trash2,
  Calendar,
  Layers,
  Activity,
  Thermometer,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Copy,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface SnapshotRetrospectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: TwinSnapshot[];
  selectedSnapshotId: string | null;
  onSelectSnapshot: (id: string) => void;
  onRestoreTwinState: (params: PhysicalParameters, version: string, generation: number) => void;
  onDeleteSnapshot: (id: string) => void;
  onClearAllSnapshots: () => void;
  onManualCapture: () => void;
  currentSpec: MachinerySpec;
}

const PARAMETER_LABELS: Record<keyof PhysicalParameters, { label: string; unit: string; description: string }> = {
  dampingCoeff: { label: 'Damping Coeff (β)', unit: 'N·s/m', description: 'Viscous damping of bearing oil film' },
  bearingClearance: { label: 'Bearing Clearance (c)', unit: 'µm', description: 'Radial mechanical raceway play' },
  frictionCoeff: { label: 'Friction Coeff (µ)', unit: 'dim', description: 'Surface contact tribological coefficient' },
  thermalDissipation: { label: 'Thermal Dissipation (k_th)', unit: 'W/K', description: 'Casing conduction & convection rate' },
  alignmentAngle: { label: 'Shaft Misalignment (θ)', unit: 'deg', description: 'Angular offset between driver & load' },
  unbalanceMass: { label: 'Unbalance Mass (m_e)', unit: 'g·mm', description: 'Eccentric rotor centrifugal moment' },
  rotorStiffness: { label: 'Rotor Stiffness (k_r)', unit: 'kN/mm', description: 'Shaft elastic resistance to deflection' },
};

export const SnapshotRetrospectiveModal: React.FC<SnapshotRetrospectiveModalProps> = ({
  isOpen,
  onClose,
  snapshots,
  selectedSnapshotId,
  onSelectSnapshot,
  onRestoreTwinState,
  onDeleteSnapshot,
  onClearAllSnapshots,
  onManualCapture,
  currentSpec,
}) => {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'manual'>('all');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [restoreSuccess, setRestoreSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const filteredSnapshots = snapshots.filter((s) => {
    if (filter === 'critical') return s.highestSeverity === 'critical';
    if (filter === 'warning') return s.highestSeverity === 'warning';
    if (filter === 'manual') return s.triggerType === 'manual';
    return true;
  });

  const activeSnapshot =
    snapshots.find((s) => s.id === selectedSnapshotId) || filteredSnapshots[0] || null;

  const handleCopyJSON = (snap: TwinSnapshot) => {
    navigator.clipboard.writeText(JSON.stringify(snap, null, 2));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleRestore = (snap: TwinSnapshot) => {
    onRestoreTwinState(
      snap.twinState.params,
      snap.twinState.version,
      snap.twinState.generation
    );
    setRestoreSuccess(true);
    setTimeout(() => setRestoreSuccess(false), 2500);
  };

  return (
    <div
      id="snapshot-retrospective-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md"
    >
      <div
        id="snapshot-retrospective-modal-container"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white font-mono uppercase tracking-wider">
                  Twin State Retrospective Review
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {snapshots.length} Snapshots
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated cyber-physical state captures triggered by telemetry safety bounds exceedance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="capture-manual-snapshot-btn"
              onClick={onManualCapture}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Manually capture current twin state right now"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>Capture Now</span>
            </button>

            {snapshots.length > 0 && (
              <button
                id="clear-all-snapshots-btn"
                onClick={onClearAllSnapshots}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 rounded-lg text-xs font-mono transition-colors cursor-pointer"
                title="Clear all recorded snapshots"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              id="close-retrospective-modal-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center justify-between gap-2 px-5 py-2.5 border-b border-slate-800 bg-slate-950/50 text-xs font-mono overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 mr-1">Filter:</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-slate-800 text-white font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({snapshots.length})
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                filter === 'critical'
                  ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertOctagon className="w-3 h-3 text-rose-400" />
              Critical ({snapshots.filter((s) => s.highestSeverity === 'critical').length})
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                filter === 'warning'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              Warning ({snapshots.filter((s) => s.highestSeverity === 'warning').length})
            </button>
            <button
              onClick={() => setFilter('manual')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                filter === 'manual'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera className="w-3 h-3 text-cyan-400" />
              Manual ({snapshots.filter((s) => s.triggerType === 'manual').length})
            </button>
          </div>

          {currentSpec.safetyBounds && (
            <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-400">
              <span className="text-slate-500">Active Bounds ({currentSpec.name}):</span>
              <span>Vib: <strong>{currentSpec.safetyBounds.vibrationCritical} mm/s</strong></span>
              <span>Temp: <strong>{currentSpec.safetyBounds.temperatureCritical}°C</strong></span>
              <span>Anomaly: <strong>{Math.round(currentSpec.safetyBounds.anomalyCritical * 100)}%</strong></span>
            </div>
          )}
        </div>

        {/* Modal Body: Split Timeline and Deep Inspector */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">
          
          {/* Left Column: Timeline List (4 cols) */}
          <div className="lg:col-span-4 border-r border-slate-800 flex flex-col bg-slate-950/40 overflow-hidden">
            <div className="p-3 border-b border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>CAPTURED EVENTS TIMELINE</span>
              <span>{filteredSnapshots.length} MATCHING</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
              {filteredSnapshots.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 gap-3">
                  <div className="p-3 rounded-full bg-slate-800/80 text-slate-400">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-300">No Snapshots Found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Snapshots automatically trigger when live telemetry exceeds safety limits, or you can capture one manually.
                    </p>
                  </div>
                  <button
                    onClick={onManualCapture}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono transition-colors cursor-pointer"
                  >
                    Capture Snapshot Now
                  </button>
                </div>
              ) : (
                filteredSnapshots.map((snap) => {
                  const isSelected = activeSnapshot?.id === snap.id;
                  const isCrit = snap.highestSeverity === 'critical';
                  const isWarn = snap.highestSeverity === 'warning';

                  return (
                    <div
                      key={snap.id}
                      onClick={() => onSelectSnapshot(snap.id)}
                      className={`p-3 rounded-xl border text-xs font-mono transition-all cursor-pointer relative group flex flex-col gap-2 ${
                        isSelected
                          ? 'bg-slate-800/90 border-cyan-500/60 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                          : 'bg-slate-900/60 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                      }`}
                    >
                      {/* Top Row: Timestamp & Severity Pill */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{snap.timeFormatted}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isCrit
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : isWarn
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            }`}
                          >
                            {snap.triggerType === 'manual' ? 'MANUAL' : snap.highestSeverity}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSnapshot(snap.id);
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete snapshot"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Machinery name & Generation */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="truncate max-w-[180px]">{snap.machineryName}</span>
                        <span className="text-cyan-400 font-semibold">
                          v{snap.twinState.version} (Gen #{snap.twinState.generation})
                        </span>
                      </div>

                      {/* Breached Metrics Summary */}
                      {snap.breachedMetrics.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {snap.breachedMetrics.map((m, idx) => (
                            <span
                              key={idx}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                m.severity === 'critical'
                                  ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                                  : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                              }`}
                            >
                              {m.metric === 'vibration' ? 'Vib' : m.metric === 'temperature' ? 'Temp' : 'Anomaly'}:{' '}
                              <strong>{m.actualValue.toFixed(1)}{m.unit}</strong>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">
                          Manual state checkpoint • Normal telemetry limits
                        </span>
                      )}

                      {/* Right selection chevron indicator */}
                      {isSelected && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-400">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Deep Retrospective Inspector (8 cols) */}
          <div className="lg:col-span-8 flex flex-col bg-slate-900/60 overflow-y-auto p-4 sm:p-6 gap-5">
            {activeSnapshot ? (
              <>
                {/* Snapshot Header Info Card */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white font-mono">
                          {activeSnapshot.machineryName}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                            activeSnapshot.highestSeverity === 'critical'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : activeSnapshot.highestSeverity === 'warning'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          }`}
                        >
                          {activeSnapshot.triggerType === 'manual' ? 'Manual Capture' : `${activeSnapshot.highestSeverity} Breach`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-1">
                        Snapshot ID: <span className="text-slate-300">{activeSnapshot.id}</span> • Captured at {activeSnapshot.timeFormatted}
                      </p>
                    </div>

                    {/* Action Buttons for active snapshot */}
                    <div className="flex items-center gap-2">
                      <button
                        id="restore-snapshot-twin-btn"
                        onClick={() => handleRestore(activeSnapshot)}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-900/30 cursor-pointer"
                        title="Restore current digital twin simulation parameters to this exact frozen snapshot"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore Model</span>
                      </button>

                      <button
                        id="copy-snapshot-json-btn"
                        onClick={() => handleCopyJSON(activeSnapshot)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Copy JSON to clipboard"
                      >
                        <Copy className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Copy JSON</span>
                      </button>
                    </div>
                  </div>

                  {/* Feedback toasts if copied or restored */}
                  {copySuccess && (
                    <div className="bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Snapshot JSON copied to clipboard!</span>
                    </div>
                  )}

                  {restoreSuccess && (
                    <div className="bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Digital Twin model state restored successfully to Version {activeSnapshot.twinState.version} (Gen #{activeSnapshot.twinState.generation})!</span>
                    </div>
                  )}

                  {/* Diagnostic Summary Note */}
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 font-mono leading-relaxed">
                    {activeSnapshot.summaryNote}
                  </div>
                </div>

                {/* Telemetry At Snapshot Moment vs Safety Bounds */}
                <div>
                  <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>Telemetry at Capture vs Safety Thresholds</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Vibration Box */}
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 font-mono">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Vibration RMS</span>
                        <Activity className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold text-white">
                          {activeSnapshot.telemetry.physicalVibration.toFixed(2)}
                        </span>
                        <span className="text-xs text-slate-400">mm/s</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex flex-col gap-0.5 border-t border-slate-800/80 pt-1.5">
                        <div className="flex justify-between">
                          <span>Twin Est:</span>
                          <span className="text-cyan-400">{activeSnapshot.telemetry.evolvedTwinVibration.toFixed(2)} mm/s</span>
                        </div>
                        {currentSpec.safetyBounds && (
                          <div className="flex justify-between text-rose-400">
                            <span>Safety Limit:</span>
                            <span>{currentSpec.safetyBounds.vibrationCritical.toFixed(1)} mm/s</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Temperature Box */}
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 font-mono">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Core Temperature</span>
                        <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold text-white">
                          {activeSnapshot.telemetry.physicalTemp.toFixed(1)}
                        </span>
                        <span className="text-xs text-slate-400">°C</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex flex-col gap-0.5 border-t border-slate-800/80 pt-1.5">
                        <div className="flex justify-between">
                          <span>Twin Est:</span>
                          <span className="text-cyan-400">{activeSnapshot.telemetry.evolvedTwinTemp.toFixed(1)}°C</span>
                        </div>
                        {currentSpec.safetyBounds && (
                          <div className="flex justify-between text-amber-400">
                            <span>Safety Limit:</span>
                            <span>{currentSpec.safetyBounds.temperatureCritical.toFixed(1)}°C</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Anomaly / Operating Speed Box */}
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 font-mono">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Anomaly Rating</span>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-xl font-bold ${activeSnapshot.telemetry.anomalyScore > 0.5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {Math.round(activeSnapshot.telemetry.anomalyScore * 100)}%
                        </span>
                        <span className="text-xs text-slate-400">confidence</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex flex-col gap-0.5 border-t border-slate-800/80 pt-1.5">
                        <div className="flex justify-between">
                          <span>RPM:</span>
                          <span className="text-cyan-400">{activeSnapshot.telemetry.rpm}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Twin Fit:</span>
                          <span className="text-emerald-400">{activeSnapshot.twinState.fitAccuracy.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Frozen Cyber-Physical Model Parameter Set */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      <span>Frozen Cyber-Physical Parameters (Version {activeSnapshot.twinState.version}, Gen #{activeSnapshot.twinState.generation})</span>
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500">
                      Baseline vs Snapshot Value
                    </span>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-xs font-mono text-left">
                      <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Parameter</th>
                          <th className="px-3 py-2 font-semibold">Nominal Baseline</th>
                          <th className="px-3 py-2 font-semibold">Snapshot Frozen Value</th>
                          <th className="px-3 py-2 font-semibold">Delta vs Nominal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {(Object.keys(PARAMETER_LABELS) as (keyof PhysicalParameters)[]).map((key) => {
                          const nominalVal = currentSpec.defaultParams[key];
                          const snapVal = activeSnapshot.twinState.params[key];
                          const delta = snapVal - nominalVal;
                          const pctDelta = nominalVal !== 0 ? (delta / nominalVal) * 100 : 0;
                          const isChanged = Math.abs(pctDelta) > 1.0;

                          return (
                            <tr key={key} className="hover:bg-slate-900/40">
                              <td className="px-3 py-2 text-slate-300">
                                <div>{PARAMETER_LABELS[key].label}</div>
                                <div className="text-[10px] text-slate-500">{PARAMETER_LABELS[key].description}</div>
                              </td>
                              <td className="px-3 py-2 text-slate-400">
                                {nominalVal.toFixed(3)} {PARAMETER_LABELS[key].unit}
                              </td>
                              <td className="px-3 py-2 font-bold text-white">
                                {snapVal.toFixed(3)} {PARAMETER_LABELS[key].unit}
                              </td>
                              <td className="px-3 py-2">
                                {isChanged ? (
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      delta > 0
                                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                        : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                    }`}
                                  >
                                    {delta > 0 ? '+' : ''}
                                    {delta.toFixed(3)} ({pctDelta > 0 ? '+' : ''}{pctDelta.toFixed(1)}%)
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[10px]">Nominal (0.0%)</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sub-Components Health Matrix at Snapshot Moment */}
                {activeSnapshot.componentsState.length > 0 && (
                  <div>
                    <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>Sub-Component Health at Snapshot</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {activeSnapshot.componentsState.map((comp) => (
                        <div
                          key={comp.id}
                          className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-1.5 font-mono text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200">{comp.name}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                                comp.healthScore >= 90
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : comp.healthScore >= 70
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {comp.healthScore}% Health
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>Temp: {comp.temperature}°C</span>
                            <span>Vib: {comp.vibrationRMS} mm/s</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2 p-8">
                <Camera className="w-8 h-8 text-slate-600" />
                <p className="text-sm font-mono">Select a snapshot on the left to inspect retrospective details</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-900/90 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Safety Bounds Auto-Snapshot Active</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold font-mono transition-colors cursor-pointer"
          >
            Close Retrospective Review
          </button>
        </div>
      </div>
    </div>
  );
};
