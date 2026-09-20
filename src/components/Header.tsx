import React from 'react';
import { MachineryType } from '../types';
import { MACHINERY_SPECS } from '../data/machinerySpecs';
import { Cpu, Zap, Activity, RefreshCw, AlertTriangle, ShieldCheck, Play, Pause, Sparkles, Camera } from 'lucide-react';

interface HeaderProps {
  selectedType: MachineryType;
  onSelectType: (type: MachineryType) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onTriggerEvolution: () => void;
  isEvolving: boolean;
  onOpenAnomalyModal: () => void;
  onOpenSnapshotModal: () => void;
  snapshotCount: number;
  twinVersion: string;
  evolutionCount: number;
  fitAccuracy: number;
  hasActiveAnomaly: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  selectedType,
  onSelectType,
  isSimulating,
  onToggleSimulation,
  onTriggerEvolution,
  isEvolving,
  onOpenAnomalyModal,
  onOpenSnapshotModal,
  snapshotCount,
  twinVersion,
  evolutionCount,
  fitAccuracy,
  hasActiveAnomaly,
}) => {
  const currentSpec = MACHINERY_SPECS[selectedType];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Machinery Selector */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-blue-500 rounded-xl shadow-lg shadow-cyan-500/20 text-white flex items-center justify-center">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white font-mono">
                  EDGE-TWIN <span className="text-cyan-400">v{twinVersion}</span>
                </h1>
                <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Edge-Native Active
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Self-Evolving Industrial Cyber-Physical Digital Twin Architecture
              </p>
            </div>

            {/* Machinery Selector Dropdown */}
            <div className="ml-2 sm:ml-4 border-l border-slate-700 pl-3">
              <select
                id="machinery-select"
                value={selectedType}
                onChange={(e) => onSelectType(e.target.value as MachineryType)}
                className="bg-slate-800 border border-slate-700 text-slate-100 text-xs font-medium rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 p-2 pr-8 font-sans cursor-pointer hover:bg-slate-750 transition-colors"
              >
                {Object.values(MACHINERY_SPECS).map((spec) => (
                  <option key={spec.id} value={spec.id}>
                    {spec.name} ({spec.powerRating})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Edge Node Live Telemetry Metrics */}
          <div className="hidden lg:flex items-center gap-4 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5 font-mono text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">Execution:</span>
              <span className="text-cyan-300 font-bold">1.8 ms</span>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Accuracy:</span>
              <span className="text-emerald-400 font-bold">{fitAccuracy.toFixed(1)}%</span>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400">Evolutions:</span>
              <span className="text-blue-300 font-bold">#{evolutionCount}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Stream Toggle Button */}
            <button
              id="toggle-sim-btn"
              onClick={onToggleSimulation}
              className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm ${
                isSimulating
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isSimulating ? 'Pause Stream' : 'Resume Stream'}</span>
            </button>

            {/* Anomaly Injector Button */}
            <button
              id="open-anomaly-btn"
              onClick={onOpenAnomalyModal}
              className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border ${
                hasActiveAnomaly
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${hasActiveAnomaly ? 'text-amber-400 animate-bounce' : 'text-slate-400'}`} />
              <span>{hasActiveAnomaly ? 'Fault Active' : 'Inject Anomaly'}</span>
            </button>

            {/* Retrospective Snapshots Button */}
            <button
              id="open-snapshots-btn"
              onClick={onOpenSnapshotModal}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all relative cursor-pointer"
              title="Open Retrospective Snapshots Archive"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>Snapshots</span>
              {snapshotCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {snapshotCount}
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono text-slate-500 bg-slate-750">
                  0
                </span>
              )}
            </button>

            {/* AI Evolution Trigger Button */}
            <button
              id="trigger-evolution-btn"
              onClick={onTriggerEvolution}
              disabled={isEvolving}
              className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isEvolving ? 'animate-spin' : ''}`} />
              <span>{isEvolving ? 'Evolving Twin...' : 'Self-Evolve Twin'}</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
