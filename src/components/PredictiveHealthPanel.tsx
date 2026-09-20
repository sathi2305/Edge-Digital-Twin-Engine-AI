import React from 'react';
import { AIAnalysisResponse, AnomalyConfig, TelemetryPoint } from '../types';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Wrench,
  CheckCircle2,
  FileText,
  AlertCircle,
  AlertTriangle,
  AlertOctagon,
  Calendar,
  CalendarClock,
  Sparkles,
} from 'lucide-react';

interface PredictiveHealthPanelProps {
  telemetry: TelemetryPoint | null;
  anomalyConfig: AnomalyConfig;
  aiAnalysis: AIAnalysisResponse | null;
  isEvolving: boolean;
  onRunEvolution: () => void;
}

export const PredictiveHealthPanel: React.FC<PredictiveHealthPanelProps> = ({
  telemetry,
  anomalyConfig,
  aiAnalysis,
  isEvolving,
  onRunEvolution,
}) => {
  // Compute health score based on anomaly score and telemetry status
  const anomalyScore = telemetry?.anomalyScore || 0.0;
  const healthScore = Math.max(5, Math.round((1 - anomalyScore) * 100));

  // Determine dynamic Remaining Useful Life (RUL) in hours
  const rulHours =
    aiAnalysis?.rulHours !== undefined
      ? aiAnalysis.rulHours
      : anomalyConfig.type !== 'none'
      ? anomalyConfig.severity === 'severe'
        ? Math.max(4, Math.round(14 + (healthScore / 100) * 24)) // 14 - 38 hrs (< 48 hrs critical!)
        : anomalyConfig.severity === 'moderate'
        ? Math.max(26, Math.round(34 + (healthScore / 100) * 38)) // 34 - 72 hrs
        : Math.round(80 + (healthScore / 100) * 120) // 80 - 200 hrs
      : healthScore > 80
      ? Math.round(2400 + (healthScore - 80) * 120) // 2400 - 4800 hrs
      : healthScore > 50
      ? Math.round(120 + (healthScore - 50) * 24) // 120 - 840 hrs
      : Math.max(6, Math.round(healthScore * 1.5)); // 6 - 45 hrs (< 48 hrs critical!)

  // Calculate estimated maintenance target timestamp and date
  const now = Date.now();
  const maintenanceTargetTimestamp = now + rulHours * 3600 * 1000;
  const maintenanceTargetDate = new Date(maintenanceTargetTimestamp);

  const isUnder48Hours = rulHours <= 48;

  // Formatted date string (e.g., "Sep 21, 2026")
  const formattedMaintenanceDate = maintenanceTargetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Formatted time string (e.g., "14:30")
  const formattedMaintenanceTime = maintenanceTargetDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // Humanized countdown text
  const roundedHours = Math.max(1, Math.round(rulHours));
  let countdownText = '';
  if (roundedHours <= 1) {
    countdownText = 'within 1 hr';
  } else if (roundedHours <= 48) {
    countdownText = `in ${roundedHours} hrs`;
  } else if (roundedHours <= 168) {
    const days = Math.round(roundedHours / 24);
    countdownText = `in ~${days} days (${roundedHours}h)`;
  } else {
    const days = Math.round(roundedHours / 24);
    countdownText = `in ~${days} days`;
  }

  const statusColor =
    healthScore > 80
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
      : healthScore > 50
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
      : 'text-rose-400 bg-rose-500/10 border-rose-500/30';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Predictive Health & RUL Engine
            </h2>
            <p className="text-xs text-slate-400">Remaining Useful Life Projection & AI Work Order Synthesis</p>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${statusColor}`}>
          Health: {healthScore}%
        </span>
      </div>

      {/* Gauges, RUL & Estimated Maintenance Schedule Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Machine Health Score Card */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-slate-400 block">HEALTH INDEX</span>
            <span
              className={`text-2xl font-bold font-mono mt-1 block ${
                healthScore > 80 ? 'text-emerald-400' : healthScore > 50 ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              {healthScore} / 100
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {healthScore > 80 ? 'Optimal Operations' : healthScore > 50 ? 'Degradation Detected' : 'Maintenance Required'}
            </span>
          </div>

          <div className="w-14 h-14 rounded-full border-4 border-slate-800 flex items-center justify-center relative flex-shrink-0">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                healthScore > 80
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : healthScore > 50
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Estimated RUL Card */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-slate-400 block">REMAINING USEFUL LIFE</span>
            <span
              className={`text-2xl font-bold font-mono mt-1 block ${
                isUnder48Hours ? 'text-rose-400 animate-pulse' : 'text-amber-300'
              }`}
            >
              {rulHours} hrs
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Operating Hours To Maintenance</span>
          </div>

          <div
            className={`p-2.5 rounded-xl border flex-shrink-0 ${
              isUnder48Hours
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
          >
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Estimated Maintenance Date Widget */}
        <div
          id="estimated-maintenance-date-widget"
          className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
            isUnder48Hours
              ? 'bg-gradient-to-br from-rose-950/90 via-rose-900/40 to-slate-950 border-rose-500 shadow-xl shadow-rose-950/60 ring-1 ring-rose-500/50'
              : 'bg-slate-950 border-slate-800'
          }`}
        >
          {/* Ambient red blur when critical */}
          {isUnder48Hours && (
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-rose-500/20 blur-xl pointer-events-none" />
          )}

          <div className="flex items-start justify-between gap-2 relative z-10">
            <div>
              <span
                className={`text-xs font-mono font-bold block ${
                  isUnder48Hours ? 'text-rose-400 flex items-center gap-1' : 'text-slate-400'
                }`}
              >
                {isUnder48Hours && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 inline" />}
                ESTIMATED MAINTENANCE DATE
              </span>
              <span
                className={`text-xl font-bold font-mono mt-1 block tracking-tight ${
                  isUnder48Hours ? 'text-rose-100 font-extrabold' : 'text-slate-100'
                }`}
              >
                {formattedMaintenanceDate}
              </span>
              <span
                className={`text-[10px] font-mono mt-0.5 block ${
                  isUnder48Hours ? 'text-rose-300 font-semibold' : 'text-slate-400'
                }`}
              >
                at {formattedMaintenanceTime} ({countdownText})
              </span>
            </div>

            <div
              className={`p-2.5 rounded-xl border flex items-center justify-center flex-shrink-0 ${
                isUnder48Hours
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-md shadow-rose-950/50 animate-pulse'
                  : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
              }`}
            >
              {isUnder48Hours ? <AlertOctagon className="w-5 h-5" /> : <CalendarClock className="w-5 h-5" />}
            </div>
          </div>

          {/* Bottom badge / status line */}
          <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono relative z-10">
            {isUnder48Hours ? (
              <span className="w-full flex items-center justify-center gap-1.5 py-0.5 px-2 rounded bg-rose-500/30 text-rose-200 border border-rose-500/40 font-bold uppercase tracking-wider animate-pulse">
                <AlertCircle className="w-3 h-3 text-rose-300" />
                <span>Critical: Service Within 48 Hours</span>
              </span>
            ) : (
              <span className="text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Nominal turnaround schedule</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Gemini AI Diagnostic Summary & Work Order */}
      {aiAnalysis ? (
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-3.5 flex flex-col gap-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-cyan-400 font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              AI Diagnostic Analysis & Prescriptive Action
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 bg-slate-800 rounded">
              Urgency: {aiAnalysis.maintenanceUrgency}
            </span>
          </div>

          <p className="text-slate-300 leading-relaxed text-[11px]">{aiAnalysis.diagnosticSummary}</p>

          <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-slate-300 text-[11px]">
            <strong className="text-amber-400 block mb-1">Root Cause Analysis:</strong>
            {aiAnalysis.rootCauseAnalysis}
          </div>

          {/* Generated Work Order */}
          {aiAnalysis.recommendedWorkOrder && (
            <div className="p-3 bg-slate-900/90 rounded-xl border border-cyan-500/30 flex flex-col gap-2">
              <div className="flex items-center justify-between text-cyan-300 font-bold border-b border-slate-800 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-cyan-400" />
                  Work Order: {aiAnalysis.recommendedWorkOrder.title}
                </span>
                <span className="text-[10px] text-slate-400">
                  Est. Duration: {aiAnalysis.recommendedWorkOrder.estimatedHours} hrs
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 font-bold block mb-1">Action Items:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                    {aiAnalysis.recommendedWorkOrder.actionItems.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span className="text-slate-400 font-bold block mb-1">Required Spare Parts:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                    {aiAnalysis.recommendedWorkOrder.sparesRequired.map((part, idx) => (
                      <li key={idx}>{part}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 text-center text-xs font-mono text-slate-400 flex flex-col items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
          <p>Run Self-Evolution to synthesize a full predictive maintenance diagnosis & prescriptive work order.</p>
          <button
            onClick={onRunEvolution}
            disabled={isEvolving}
            className="mt-1 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
          >
            {isEvolving ? 'Analyzing Twin...' : 'Run Self-Evolution Pass'}
          </button>
        </div>
      )}
    </div>
  );
};
