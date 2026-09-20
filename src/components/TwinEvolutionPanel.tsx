import React, { useState, useMemo } from 'react';
import { PhysicalParameters, TwinState, TwinEvolutionRecord } from '../types';
import {
  Cpu,
  Code,
  History,
  Sparkles,
  Check,
  Copy,
  Sliders,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Minus,
  ArrowLeftRight,
  Scale,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Activity,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

interface TwinEvolutionPanelProps {
  twinState: TwinState;
  nominalParams: PhysicalParameters;
  currentParams: PhysicalParameters;
}

interface GenerationOption {
  id: string;
  generationNumber: number;
  version: string;
  label: string;
  shortLabel: string;
  fitScore: number;
  timestamp: string;
  triggerReason: string;
  params: PhysicalParameters;
}

export const TwinEvolutionPanel: React.FC<TwinEvolutionPanelProps> = ({
  twinState,
  nominalParams,
  currentParams,
}) => {
  const [activeTab, setActiveTab] = useState<'parameters' | 'equations' | 'edge_code' | 'history'>('parameters');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);

  // Latest Evolution Record if available
  const latestRecord = twinState.history[0];

  const paramDefinitions: { key: keyof PhysicalParameters; label: string; unit: string; description: string }[] = [
    { key: 'dampingCoeff', label: 'Damping Coefficient (β)', unit: 'N·s/m', description: 'Hydrodynamic & mechanical energy dissipation rate' },
    { key: 'bearingClearance', label: 'Bearing Clearance (c)', unit: 'μm', description: 'Radial play & race wear gap width' },
    { key: 'frictionCoeff', label: 'Friction Coefficient (μ)', unit: 'dim', description: 'Contact friction coefficient across moving faces' },
    { key: 'thermalDissipation', label: 'Thermal Dissipation (k_th)', unit: 'W/K', description: 'Housing heat transfer & cooling efficiency' },
    { key: 'alignmentAngle', label: 'Shaft Misalignment (θ)', unit: 'deg', description: 'Angular offset between motor drive and rotor shaft' },
    { key: 'unbalanceMass', label: 'Rotor Unbalance (m_e)', unit: 'g·mm', description: 'Eccentric rotor mass eccentricity' },
    { key: 'rotorStiffness', label: 'Rotor Stiffness (k_r)', unit: 'kN/mm', description: 'Flexural rigidity of shaft assembly' },
  ];

  const formatParamValue = (val: number): string => {
    if (val === undefined || isNaN(val)) return '0.00';
    if (Math.abs(val) < 0.1 && val !== 0) return val.toFixed(3);
    if (Math.abs(val) < 10) return val.toFixed(2);
    return val.toFixed(1);
  };

  // Build list of all available generation options from history array + baseline + active state
  const generationOptions = useMemo<GenerationOption[]>(() => {
    const list: GenerationOption[] = [];

    // 1. Generation 0: Baseline Nominal Specification
    list.push({
      id: 'gen_0',
      generationNumber: 0,
      version: '1.0.0',
      label: 'Gen 0 (v1.0.0 Nominal Baseline)',
      shortLabel: 'Gen 0 (Baseline)',
      fitScore: 98.4,
      timestamp: 'Initial Spec',
      triggerReason: 'Baseline Physical Parameter Specification',
      params: { ...nominalParams },
    });

    // 2. Historical generations from twinState.history (reverse ordered to be chronological)
    const reversedHistory = [...twinState.history].reverse();
    reversedHistory.forEach((record, index) => {
      const reconstructed: PhysicalParameters = { ...nominalParams };
      if (record.params) {
        Object.assign(reconstructed, record.params);
      } else if (record.parameterChanges) {
        record.parameterChanges.forEach((change) => {
          reconstructed[change.paramName] = change.newVal;
        });
      }

      const genNum = record.generation !== undefined ? record.generation : index + 1;
      list.push({
        id: record.id || `evo_${record.version}_${index}`,
        generationNumber: genNum,
        version: record.version,
        label: `Gen ${genNum} (v${record.version}) • ${record.timestamp}`,
        shortLabel: `Gen ${genNum} (v${record.version})`,
        fitScore: record.newFitScore,
        timestamp: record.timestamp,
        triggerReason: record.triggerReason,
        params: reconstructed,
      });
    });

    // 3. Current active evolved state if different from the latest record
    const hasMatchingLatest = list.some(
      (item) => item.generationNumber === twinState.generation && item.version === twinState.version
    );
    if (!hasMatchingLatest && twinState.generation > 0) {
      list.push({
        id: 'gen_active',
        generationNumber: twinState.generation,
        version: twinState.version,
        label: `Gen ${twinState.generation} (v${twinState.version} Active State)`,
        shortLabel: `Gen ${twinState.generation} (Active)`,
        fitScore: twinState.fitAccuracy,
        timestamp: twinState.lastEvolvedTime,
        triggerReason: latestRecord?.triggerReason || 'Current Live Evolved Twin State',
        params: { ...currentParams },
      });
    }

    return list;
  }, [twinState, nominalParams, currentParams, latestRecord]);

  // Selected generation IDs for side-by-side comparison
  const [selectedGenAId, setSelectedGenAId] = useState<string>('gen_0');
  const [selectedGenBId, setSelectedGenBId] = useState<string>(() => {
    if (twinState.history.length > 0) {
      return twinState.history[0].id;
    }
    return 'gen_0';
  });

  // Keep selectedGenBId synchronized with latest evolution if newly added
  React.useEffect(() => {
    if (twinState.history.length > 0) {
      const topRecord = twinState.history[0];
      setSelectedGenBId(topRecord.id);
    }
  }, [twinState.generation, twinState.history]);

  // Resolve active Generation objects
  const genA = useMemo<GenerationOption>(() => {
    return generationOptions.find((g) => g.id === selectedGenAId) || generationOptions[0];
  }, [generationOptions, selectedGenAId]);

  const genB = useMemo<GenerationOption>(() => {
    return (
      generationOptions.find((g) => g.id === selectedGenBId) ||
      generationOptions[generationOptions.length - 1] ||
      generationOptions[0]
    );
  }, [generationOptions, selectedGenBId]);

  // Swap Generation A and B
  const handleSwapGenerations = () => {
    const temp = selectedGenAId;
    setSelectedGenAId(selectedGenBId);
    setSelectedGenBId(temp);
  };

  // Compare stats between Gen A and Gen B
  const comparisonStats = useMemo(() => {
    let shiftedCount = 0;
    let maxShiftPct = 0;
    let maxShiftParam = '';

    paramDefinitions.forEach((def) => {
      const valA = genA.params[def.key];
      const valB = genB.params[def.key];
      const diff = valB - valA;
      if (Math.abs(diff) > 0.0001) {
        shiftedCount++;
        const pct = valA !== 0 ? Math.abs((diff / valA) * 100) : 0;
        if (pct > maxShiftPct) {
          maxShiftPct = pct;
          maxShiftParam = def.label;
        }
      }
    });

    const fitDiff = genB.fitScore - genA.fitScore;

    return {
      shiftedCount,
      maxShiftPct,
      maxShiftParam,
      fitDiff,
    };
  }, [genA, genB, paramDefinitions]);

  // Trend chart controls in History tab
  const [selectedTrendParam, setSelectedTrendParam] = useState<keyof PhysicalParameters>('bearingClearance');
  const [trendHorizon, setTrendHorizon] = useState<'all' | number>('all');

  // Trend trajectory dataset based on selected parameter and horizon
  const trendData = useMemo(() => {
    let list = generationOptions;
    if (trendHorizon !== 'all' && typeof trendHorizon === 'number') {
      list = list.slice(-trendHorizon);
    }
    const def = paramDefinitions.find((p) => p.key === selectedTrendParam);
    const nominalVal = nominalParams[selectedTrendParam];

    return list.map((gen) => {
      const val = gen.params[selectedTrendParam];
      const drift = val - nominalVal;
      const driftPct = nominalVal !== 0 ? (drift / Math.abs(nominalVal)) * 100 : 0;
      return {
        id: gen.id,
        generation: gen.shortLabel,
        genNum: gen.generationNumber,
        version: gen.version,
        timestamp: gen.timestamp,
        value: val,
        nominal: nominalVal,
        drift,
        driftPct,
        fitScore: gen.fitScore,
        unit: def?.unit || '',
        label: def?.label || '',
      };
    });
  }, [generationOptions, trendHorizon, selectedTrendParam, paramDefinitions, nominalParams]);

  // Degradation analysis for trend chart
  const degradationAnalysis = useMemo(() => {
    const def = paramDefinitions.find((p) => p.key === selectedTrendParam);
    const nominalVal = nominalParams[selectedTrendParam];
    const currentVal = currentParams[selectedTrendParam];
    const totalDrift = currentVal - nominalVal;
    const totalDriftPct = nominalVal !== 0 ? (totalDrift / Math.abs(nominalVal)) * 100 : 0;
    const absDriftPct = Math.abs(totalDriftPct);

    const pointsCount = trendData.length;
    const firstVal = pointsCount > 0 ? trendData[0].value : nominalVal;
    const lastVal = pointsCount > 0 ? trendData[pointsCount - 1].value : currentVal;
    const perGenDrift = pointsCount > 1 ? (lastVal - firstVal) / (pointsCount - 1) : 0;

    let severity: 'stable' | 'moderate' | 'critical' = 'stable';
    let patternLabel = 'Stable Within Baseline';

    if (absDriftPct > 25) {
      severity = 'critical';
      patternLabel = totalDrift > 0 ? 'Accelerated Degradation' : 'Critical Depletion';
    } else if (absDriftPct > 10) {
      severity = 'moderate';
      patternLabel = totalDrift > 0 ? 'Progressive Mechanical Wear' : 'Moderate Attenuation';
    }

    return {
      def,
      nominalVal,
      currentVal,
      totalDrift,
      totalDriftPct,
      absDriftPct,
      perGenDrift,
      severity,
      patternLabel,
      pointsCount,
    };
  }, [selectedTrendParam, nominalParams, currentParams, trendData, paramDefinitions]);

  const copyCodeToClipboard = () => {
    const code = latestRecord?.codeSnippetC || `// Edge-Native Digital Twin WASM/C Engine
void edge_twin_step(float* state, float* params) {
  // Auto-tuned dynamic differential state update
  float beta = params[0]; // ${currentParams.dampingCoeff.toFixed(2)} N*s/m
  float clearance = params[1]; // ${currentParams.bearingClearance.toFixed(1)} um
  state[0] += (-beta * state[1] + 1.2f) * 0.01f;
}`;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
      {/* Section Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Self-Evolving Twin State Engine
            </h2>
            <p className="text-xs text-slate-400">Autonomous Model Parameter Drift & Multi-Generation Analytics</p>
          </div>
        </div>

        {/* Tab Controls & Compare Generations Toggle */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setActiveTab('parameters');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'parameters'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Parameters Drift</span>
            </button>

            <button
              onClick={() => setActiveTab('equations')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'equations'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Physics Equations</span>
            </button>

            <button
              onClick={() => setActiveTab('edge_code')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'edge_code'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Edge C-Kernel</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Evolution History</span>
            </button>
          </div>

          {/* Toggle: Compare Generations Side-by-Side */}
          <button
            id="toggle-generation-compare-btn"
            onClick={() => {
              setIsCompareMode((prev) => !prev);
              if (!isCompareMode) {
                setActiveTab('parameters');
              }
            }}
            title="Toggle side-by-side comparison of physical parameters between any two generations"
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer border ${
              isCompareMode
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-md shadow-cyan-500/10 font-bold'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <ArrowLeftRight className={`w-3.5 h-3.5 ${isCompareMode ? 'text-cyan-400' : 'text-slate-500'}`} />
            <span>Compare Generations</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                isCompareMode
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isCompareMode ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Physical Parameters Calibration & Drift OR Side-by-Side Generation Comparator */}
      {activeTab === 'parameters' && (
        <div className="flex flex-col gap-4">
          {/* ========================================================================= */}
          {/* SIDE-BY-SIDE GENERATION COMPARATOR VIEW (WHEN TOGGLE IS ON)               */}
          {/* ========================================================================= */}
          {isCompareMode ? (
            <div className="flex flex-col gap-4 bg-slate-950/60 p-4 rounded-xl border border-cyan-500/30">
              {/* Comparator Control Bar */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                {/* Generation A Selector (Reference) */}
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      Reference Generation (A)
                    </span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      Fit: {genA.fitScore.toFixed(1)}%
                    </span>
                  </div>

                  <select
                    value={selectedGenAId}
                    onChange={(e) => setSelectedGenAId(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    {generationOptions.map((opt) => (
                      <option key={`a-${opt.id}`} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Swap Generations & Summary Metrics in Center */}
                <div className="flex md:flex-col items-center justify-center gap-2 px-2 py-1 bg-slate-950/80 rounded-lg border border-slate-800/80">
                  <button
                    onClick={handleSwapGenerations}
                    title="Swap Generation A and Generation B"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 transition-colors border border-slate-700 cursor-pointer flex items-center gap-1 text-[11px] font-mono"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Swap</span>
                  </button>

                  <div className="text-[10px] font-mono text-center flex md:flex-col items-center gap-1 text-slate-400">
                    <span className="text-slate-500">Δ Fit:</span>
                    <strong
                      className={`px-1.5 py-0.2 rounded ${
                        comparisonStats.fitDiff > 0
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : comparisonStats.fitDiff < 0
                          ? 'text-rose-400 bg-rose-500/10'
                          : 'text-slate-400'
                      }`}
                    >
                      {comparisonStats.fitDiff > 0 ? '+' : ''}
                      {comparisonStats.fitDiff.toFixed(1)}%
                    </strong>
                  </div>
                </div>

                {/* Generation B Selector (Comparison) */}
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      Comparison Generation (B)
                    </span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      Fit: {genB.fitScore.toFixed(1)}%
                    </span>
                  </div>

                  <select
                    value={selectedGenBId}
                    onChange={(e) => setSelectedGenBId(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    {generationOptions.map((opt) => (
                      <option key={`b-${opt.id}`} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Evolution Context Differentials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <div className="text-[10px] text-blue-400 uppercase font-semibold">
                    {genA.shortLabel} Trigger & Timestamp:
                  </div>
                  <p className="text-slate-300 text-[11px] mt-0.5 line-clamp-2">{genA.triggerReason}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <div className="text-[10px] text-cyan-400 uppercase font-semibold">
                    {genB.shortLabel} Trigger & Timestamp:
                  </div>
                  <p className="text-slate-300 text-[11px] mt-0.5 line-clamp-2">{genB.triggerReason}</p>
                </div>
              </div>

              {/* Side-by-Side Parameter Matrix Table / Cards */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                  <span>
                    Parameter Variances (<strong>{comparisonStats.shiftedCount}</strong> of 7 Shifted)
                  </span>
                  {comparisonStats.maxShiftPct > 0 && (
                    <span className="text-[11px] text-amber-300">
                      Max Variance: +{comparisonStats.maxShiftPct.toFixed(1)}% ({comparisonStats.maxShiftParam})
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {paramDefinitions.map((def) => {
                    const valA = genA.params[def.key];
                    const valB = genB.params[def.key];
                    const delta = valB - valA;
                    const pctChange = valA !== 0 ? (delta / Math.abs(valA)) * 100 : 0;
                    const isPositive = delta > 0.0001;
                    const isNegative = delta < -0.0001;
                    const isStable = !isPositive && !isNegative;
                    const absPct = Math.abs(pctChange);

                    return (
                      <div
                        key={`compare-${def.key}`}
                        className={`p-3 rounded-xl border transition-all ${
                          !isStable
                            ? isPositive
                              ? 'bg-slate-900/90 border-emerald-500/30 shadow-md shadow-emerald-500/5'
                              : 'bg-slate-900/90 border-rose-500/30 shadow-md shadow-rose-500/5'
                            : 'bg-slate-950/70 border-slate-800'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                          <div>
                            <span className="font-mono text-xs font-bold text-slate-200">{def.label}</span>
                            <span className="text-[11px] text-slate-400 ml-2 font-sans hidden md:inline">
                              {def.description}
                            </span>
                          </div>

                          {/* Relative Delta Pill */}
                          <div
                            className={`self-start sm:self-auto px-2 py-0.5 rounded-md border text-[11px] font-mono font-bold flex items-center gap-1 shrink-0 ${
                              isPositive
                                ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
                                : isNegative
                                ? 'bg-rose-500/15 border-rose-500/35 text-rose-400'
                                : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                            }`}
                          >
                            {isPositive && <ArrowUp className="w-3 h-3 stroke-[2.5]" />}
                            {isNegative && <ArrowDown className="w-3 h-3 stroke-[2.5]" />}
                            {isStable && <Minus className="w-3 h-3" />}
                            <span>
                              {isPositive ? `+${pctChange.toFixed(1)}%` : `${pctChange.toFixed(1)}%`}
                            </span>
                            <span className="text-[10px] opacity-80 ml-1">
                              ({isPositive ? '+' : ''}
                              {formatParamValue(delta)} {def.unit})
                            </span>
                          </div>
                        </div>

                        {/* Side-by-Side Value Columns */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2.5 font-mono text-xs items-center">
                          {/* Gen A Column */}
                          <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                            <span className="text-[10px] text-blue-400 block uppercase font-medium">
                              {genA.shortLabel}
                            </span>
                            <span className="text-slate-200 font-bold text-sm block mt-0.5">
                              {formatParamValue(valA)}{' '}
                              <span className="text-[11px] text-slate-400 font-normal">{def.unit}</span>
                            </span>
                          </div>

                          {/* Center Directional Shift Bar */}
                          <div className="flex flex-col gap-1 px-1">
                            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                              <span>{genA.shortLabel}</span>
                              <span className="text-slate-400 font-semibold">
                                {isStable ? 'Equal' : `${isPositive ? '+' : ''}${formatParamValue(delta)}`}
                              </span>
                              <span>{genB.shortLabel}</span>
                            </div>

                            <div className="w-full bg-slate-950 rounded-full h-2 flex items-center relative overflow-hidden border border-slate-800">
                              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-700 z-10" />
                              {isNegative && (
                                <div
                                  className="h-full bg-gradient-to-l from-rose-500 to-rose-400 rounded-l ml-auto transition-all"
                                  style={{
                                    width: `${Math.min(50, Math.max(5, absPct * 1.5))}%`,
                                    marginRight: '50%',
                                  }}
                                />
                              )}
                              {isPositive && (
                                <div
                                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-r transition-all"
                                  style={{
                                    width: `${Math.min(50, Math.max(5, absPct * 1.5))}%`,
                                    marginLeft: '50%',
                                  }}
                                />
                              )}
                            </div>
                          </div>

                          {/* Gen B Column */}
                          <div
                            className={`p-2 rounded-lg border ${
                              isPositive
                                ? 'bg-emerald-950/20 border-emerald-500/40'
                                : isNegative
                                ? 'bg-rose-950/20 border-rose-500/40'
                                : 'bg-slate-950 border-slate-800'
                            }`}
                          >
                            <span className="text-[10px] text-cyan-400 block uppercase font-medium">
                              {genB.shortLabel}
                            </span>
                            <span
                              className={`font-bold text-sm block mt-0.5 ${
                                isPositive
                                  ? 'text-emerald-300'
                                  : isNegative
                                  ? 'text-rose-300'
                                  : 'text-slate-200'
                              }`}
                            >
                              {formatParamValue(valB)}{' '}
                              <span className="text-[11px] opacity-75 font-normal">{def.unit}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* STANDARD ACTIVE EVOLUTION VIEW                                            */
            /* ========================================================================= */
            <>
              {/* Generation & Drift Legend Summary Banner */}
              <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Current Evolution:</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/20">
                    Generation {twinState.generation} ({twinState.version})
                  </span>
                  <span className="text-slate-500 text-[11px] hidden sm:inline">
                    • Fit Accuracy: {twinState.fitAccuracy.toFixed(1)}%
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-slate-400 font-sans">Delta Legend:</span>
                  <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    <ArrowUp className="w-3 h-3" />
                    <span>Increase (+)</span>
                  </span>
                  <span className="flex items-center gap-1 text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                    <ArrowDown className="w-3 h-3" />
                    <span>Decrease (-)</span>
                  </span>
                  <span className="flex items-center gap-1 text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/60">
                    <Minus className="w-3 h-3" />
                    <span>Stable</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {paramDefinitions.map((def) => {
                  const nomVal = nominalParams[def.key];
                  const curVal = currentParams[def.key];

                  // Check if a change was recorded in the latest evolution record
                  const recordedChange = latestRecord?.parameterChanges?.find((p) => p.paramName === def.key);

                  // Previous generation value: from latest record if available, otherwise nominal baseline
                  const prevGenVal = recordedChange !== undefined ? recordedChange.oldVal : nomVal;

                  // Delta computation since last generation
                  const delta = curVal - prevGenVal;
                  const pctChange = prevGenVal !== 0 ? (delta / Math.abs(prevGenVal)) * 100 : 0;

                  const isPositive = delta > 0.0001;
                  const isNegative = delta < -0.0001;
                  const hasChanged = isPositive || isNegative;
                  const absPct = Math.abs(pctChange);

                  return (
                    <div
                      key={def.key}
                      className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                        hasChanged
                          ? isPositive
                            ? 'bg-slate-950/90 border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                            : 'bg-slate-950/90 border-rose-500/30 shadow-lg shadow-rose-500/5'
                          : 'bg-slate-950/80 border-slate-800'
                      }`}
                    >
                      {/* Card Header with Parameter Name and Visual Delta Indicator */}
                      <div>
                        <div className="flex items-start justify-between gap-2 font-mono text-xs">
                          <span className="font-semibold text-slate-200 leading-snug">{def.label}</span>

                          {/* Visual Delta Indicator Pill */}
                          <div
                            title={`Change since last generation: ${isPositive ? '+' : ''}${formatParamValue(delta)} ${def.unit} (${isPositive ? '+' : ''}${pctChange.toFixed(1)}%)`}
                            className={`px-2 py-0.5 rounded-md border text-[11px] font-mono font-bold flex items-center gap-1 shrink-0 shadow-sm ${
                              isPositive
                                ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
                                : isNegative
                                ? 'bg-rose-500/15 border-rose-500/35 text-rose-400'
                                : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                            }`}
                          >
                            {isPositive && <ArrowUp className="w-3 h-3 stroke-[2.5]" />}
                            {isNegative && <ArrowDown className="w-3 h-3 stroke-[2.5]" />}
                            {!hasChanged && <Minus className="w-3 h-3" />}
                            <span>{isPositive ? `+${pctChange.toFixed(1)}%` : `${pctChange.toFixed(1)}%`}</span>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{def.description}</p>
                      </div>

                      {/* Values Row: Last Generation vs Active Evolved */}
                      <div className="mt-3">
                        <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                            <span className="text-[9px] text-slate-500 block uppercase font-medium">
                              {twinState.generation > 0 ? `Gen ${twinState.generation - 1}` : 'Nominal Baseline'}
                            </span>
                            <span className="text-slate-300 font-semibold text-xs block truncate mt-0.5">
                              {formatParamValue(prevGenVal)} <span className="text-[10px] text-slate-500">{def.unit}</span>
                            </span>
                          </div>

                          <div
                            className={`p-2 rounded-lg border ${
                              isPositive
                                ? 'bg-emerald-950/25 border-emerald-500/40'
                                : isNegative
                                ? 'bg-rose-950/25 border-rose-500/40'
                                : 'bg-cyan-950/20 border-cyan-500/30'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-cyan-400 block uppercase font-bold">
                                {`Gen ${twinState.generation} Active`}
                              </span>
                            </div>
                            <span
                              className={`font-bold text-xs block truncate mt-0.5 ${
                                isPositive ? 'text-emerald-300' : isNegative ? 'text-rose-300' : 'text-cyan-300'
                              }`}
                            >
                              {formatParamValue(curVal)} <span className="text-[10px] opacity-75">{def.unit}</span>
                            </span>
                          </div>
                        </div>

                        {/* Numeric Delta Breakdown & Graphical Magnitude Meter */}
                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-slate-400 text-[10px]">
                              Δ vs Gen {Math.max(0, twinState.generation - 1)}:
                            </span>
                            <span
                              className={`font-bold text-[11px] flex items-center gap-1 ${
                                isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-slate-400'
                              }`}
                            >
                              {isPositive ? '+' : ''}
                              {formatParamValue(delta)} {def.unit}
                              <span className="text-[10px] opacity-80">
                                ({isPositive ? '+' : ''}
                                {pctChange.toFixed(1)}%)
                              </span>
                            </span>
                          </div>

                          {/* Directional Magnitude Gauge Bar (Center Zero Axis) */}
                          <div className="w-full bg-slate-900 rounded-full h-1.5 flex items-center relative overflow-hidden border border-slate-800">
                            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-700 z-10" />

                            {isNegative && (
                              <div
                                className="h-full bg-gradient-to-l from-rose-500 to-rose-400 rounded-l ml-auto transition-all duration-300"
                                style={{
                                  width: `${Math.min(50, Math.max(4, absPct * 1.5))}%`,
                                  marginRight: '50%',
                                }}
                              />
                            )}

                            {isPositive && (
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-r transition-all duration-300"
                                style={{
                                  width: `${Math.min(50, Math.max(4, absPct * 1.5))}%`,
                                  marginLeft: '50%',
                                }}
                              />
                            )}
                          </div>

                          <div className="flex justify-between text-[9px] font-mono text-slate-500 px-0.5">
                            <span className={isNegative ? 'text-rose-400 font-semibold' : ''}>- Shift</span>
                            <span className="text-slate-600">0</span>
                            <span className={isPositive ? 'text-emerald-400 font-semibold' : ''}>+ Shift</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 2: Dynamic Differential State Equations */}
      {activeTab === 'equations' && (
        <div className="flex flex-col gap-3 font-mono text-xs">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-200 flex flex-col gap-3">
            <span className="text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
              Active Evolved Physics State Equations (LaTeX Representation)
            </span>

            <div className="p-3 bg-slate-900 rounded-lg border border-slate-700 text-center text-cyan-300 font-mono text-sm leading-relaxed overflow-x-auto">
              {latestRecord?.equationUpdate || (
                `m\\ddot{x} + \\beta_{calib}\\dot{x} + k_{r} x = F_{unbalance}\\cos(\\omega t) + \\mu_{calib} N(t)`
              )}
            </div>

            <p className="text-slate-400 text-[11px]">
              The Self-Evolving Digital Twin replaces generic static differential terms with auto-calibrated coefficient matrices calculated from high-frequency telemetry residuals.
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: Synthesized Edge C-Code Engine */}
      {activeTab === 'edge_code' && (
        <div className="flex flex-col gap-2 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Generated Micro-Kernel C Code (Target: WASM / Edge Gateway PLC)</span>
            <button
              onClick={copyCodeToClipboard}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer text-[11px]"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-cyan-300 overflow-x-auto text-[11px] leading-relaxed max-h-56">
            {latestRecord?.codeSnippetC ||
`// Edge-Native Digital Twin Calibration Engine
// Target: Microcontroller / WASM Edge Gateway
#include <math.h>

void edge_twin_step(float* state, const float* telemetry) {
    float beta = ${currentParams.dampingCoeff.toFixed(2)}f; // Calibrated Damping
    float clearance = ${currentParams.bearingClearance.toFixed(1)}f; // Calibrated Clearance
    float friction = ${currentParams.frictionCoeff.toFixed(3)}f; // Calibrated Friction

    // Execute low-latency dynamic model update
    state[0] += (-beta * state[1] + friction * 0.12f) * 0.01f;
}`}
          </pre>
        </div>
      )}

      {/* Tab 4: Evolution Event Timeline & Parameter Degradation Trend Chart */}
      {activeTab === 'history' && (
        <div className="flex flex-col gap-4 font-mono text-xs">
          {/* Trend Chart Card */}
          <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-3.5 flex flex-col gap-3">
            {/* Trend Chart Header with Parameter and Horizon Selectors */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-100 text-xs uppercase tracking-wide">
                    Parameter Degradation Trajectory
                  </h3>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Multi-generation drift trajectory across previous N model revisions
                  </p>
                </div>
              </div>

              {/* Controls: Parameter Selection & N-Generations Horizon */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Parameter Selector */}
                <select
                  id="trend-param-selector"
                  value={selectedTrendParam}
                  onChange={(e) => setSelectedTrendParam(e.target.value as keyof PhysicalParameters)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {paramDefinitions.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>

                {/* N-Generations Window Filter Buttons */}
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                  <span className="text-slate-500 px-1 font-sans">Window:</span>
                  {[3, 5, 10, 'all'].map((opt) => (
                    <button
                      key={String(opt)}
                      onClick={() => setTrendHorizon(opt as any)}
                      className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer font-bold ${
                        trendHorizon === opt
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {opt === 'all' ? `All (${generationOptions.length})` : `Last ${opt}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Trajectory Pattern Insight Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Baseline (Gen 0)</span>
                <span className="text-slate-300 font-bold block mt-0.5">
                  {formatParamValue(degradationAnalysis.nominalVal)}{' '}
                  <span className="text-[10px] text-slate-500 font-normal">{degradationAnalysis.def?.unit}</span>
                </span>
              </div>

              <div>
                <span className="text-[10px] text-cyan-400 uppercase block">Current Active State</span>
                <span className="text-cyan-300 font-bold block mt-0.5">
                  {formatParamValue(degradationAnalysis.currentVal)}{' '}
                  <span className="text-[10px] opacity-75 font-normal">{degradationAnalysis.def?.unit}</span>
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Total Net Drift</span>
                <span
                  className={`font-bold block mt-0.5 flex items-center gap-1 ${
                    degradationAnalysis.totalDrift > 0.0001
                      ? 'text-emerald-400'
                      : degradationAnalysis.totalDrift < -0.0001
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }`}
                >
                  {degradationAnalysis.totalDrift > 0.0001 && <ArrowUp className="w-3 h-3" />}
                  {degradationAnalysis.totalDrift < -0.0001 && <ArrowDown className="w-3 h-3" />}
                  {degradationAnalysis.totalDrift > 0 ? '+' : ''}
                  {formatParamValue(degradationAnalysis.totalDrift)} {degradationAnalysis.def?.unit}{' '}
                  <span className="text-[10px] opacity-80">
                    ({degradationAnalysis.totalDrift > 0 ? '+' : ''}
                    {degradationAnalysis.totalDriftPct.toFixed(1)}%)
                  </span>
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Wear Trajectory</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border truncate ${
                      degradationAnalysis.severity === 'critical'
                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                        : degradationAnalysis.severity === 'moderate'
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                        : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    }`}
                  >
                    {degradationAnalysis.patternLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="w-full h-48 sm:h-52 pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 12, right: 15, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="paramTrendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="generation"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as any;
                        if (!data) return null;
                        const isPos = data.drift > 0.0001;
                        const isNeg = data.drift < -0.0001;
                        return (
                          <div className="bg-slate-950/95 border border-slate-700 p-2.5 rounded-xl shadow-2xl font-mono text-xs text-slate-200 flex flex-col gap-1.5 z-50">
                            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1">
                              <span className="font-bold text-cyan-400">{data.generation}</span>
                              <span className="text-[10px] text-slate-500">{data.timestamp}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-[11px]">
                              <span className="text-slate-400">Calibrated Value:</span>
                              <strong className="text-white">
                                {formatParamValue(data.value)} {data.unit}
                              </strong>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-[11px]">
                              <span className="text-slate-400">Nominal Baseline:</span>
                              <span className="text-amber-400/90">
                                {formatParamValue(data.nominal)} {data.unit}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-[11px]">
                              <span className="text-slate-400">Net Deviation:</span>
                              <strong
                                className={`${
                                  isPos ? 'text-emerald-400' : isNeg ? 'text-rose-400' : 'text-slate-400'
                                }`}
                              >
                                {isPos ? '+' : ''}
                                {formatParamValue(data.drift)} {data.unit} ({isPos ? '+' : ''}
                                {data.driftPct.toFixed(1)}%)
                              </strong>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                              <span>Model Fit Accuracy:</span>
                              <span className="text-cyan-300 font-bold">{data.fitScore}%</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={degradationAnalysis.nominalVal}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{
                      value: `Nominal: ${formatParamValue(degradationAnalysis.nominalVal)} ${degradationAnalysis.def?.unit}`,
                      fill: '#fbbf24',
                      fontSize: 10,
                      position: 'insideTopRight',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#22d3ee"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#paramTrendGradient)"
                    dot={{ r: 4, fill: '#0891b2', stroke: '#a5f3fc', strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Chart Footer Info */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/80 flex-wrap gap-2">
              <span className="flex items-center gap-1.5 font-sans">
                <span className="w-2.5 h-0.5 bg-amber-400 inline-block border-dashed" />
                <span className="text-amber-400/90 font-mono">Dashed Amber:</span> Baseline Specification
              </span>
              <span className="font-mono text-slate-400">
                Drift Rate: {degradationAnalysis.perGenDrift >= 0 ? '+' : ''}
                {formatParamValue(degradationAnalysis.perGenDrift)} {degradationAnalysis.def?.unit} / generation
              </span>
            </div>
          </div>

          {/* Historical Generations List Section Header */}
          <div className="flex items-center justify-between text-slate-400 px-1 pt-1">
            <span className="font-bold uppercase text-[11px] text-slate-300">
              Evolution Ledger ({twinState.history.length} Event{twinState.history.length !== 1 ? 's' : ''})
            </span>
            <span className="text-[10px] text-slate-500">
              Chronological log of AI parameter calibrations
            </span>
          </div>

          {/* Historical Records List */}
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
            {twinState.history.length === 0 ? (
              <div className="text-center py-6 text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800">
                <p>No self-evolution passes recorded yet.</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Click "Self-Evolve Twin" above to run dynamic parameter calibration and observe trajectory trends.
                </p>
              </div>
            ) : (
              twinState.history.map((record, index) => (
                <div key={record.id || index} className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-cyan-400">Twin Version {record.version}</span>
                      <span className="text-slate-500 text-[10px]">{record.timestamp}</span>
                    </div>

                    {/* Button to quick-compare this historical generation */}
                    <button
                      onClick={() => {
                        setSelectedGenAId('gen_0');
                        setSelectedGenBId(record.id);
                        setIsCompareMode(true);
                        setActiveTab('parameters');
                      }}
                      className="px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ArrowLeftRight className="w-2.5 h-2.5" />
                      <span>Compare with Baseline</span>
                    </button>
                  </div>

                  <p className="text-slate-300 text-[11px]">{record.triggerReason}</p>

                  <div className="flex items-center gap-4 text-[11px] flex-wrap">
                    <span className="text-slate-400">
                      Accuracy Gain: <strong className="text-emerald-400">+{ (record.newFitScore - record.prevFitScore).toFixed(1) }%</strong>
                    </span>
                    <span className="text-slate-400">
                      New Fit: <strong className="text-cyan-300">{record.newFitScore.toFixed(1)}%</strong>
                    </span>
                    <span className="text-slate-400">
                      Est. RUL: <strong className="text-amber-300">{record.rulHoursEstimate} hrs</strong>
                    </span>
                  </div>

                  {/* Historical Parameter Delta Chips */}
                  {record.parameterChanges && record.parameterChanges.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                      {record.parameterChanges.map((change, cIdx) => {
                        const pDiff = change.newVal - change.oldVal;
                        const pPct = change.oldVal !== 0 ? (pDiff / Math.abs(change.oldVal)) * 100 : 0;
                        const isPos = pDiff > 0.0001;
                        const isNeg = pDiff < -0.0001;
                        if (Math.abs(pDiff) <= 0.0001) return null;

                        return (
                          <span
                            key={cIdx}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono border flex items-center gap-1 ${
                              isPos
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                : isNeg
                                ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}
                          >
                            {isPos ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                            <span>{change.label}:</span>
                            <strong>
                              {isPos ? '+' : ''}
                              {pPct.toFixed(1)}%
                            </strong>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
