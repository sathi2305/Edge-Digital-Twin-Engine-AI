import React, { useEffect, useState } from 'react';
import { TwinSnapshot } from '../types';
import { Camera, AlertOctagon, AlertTriangle, ArrowRight, X, ShieldAlert, Cpu } from 'lucide-react';

interface SnapshotNotificationToastProps {
  snapshot: TwinSnapshot | null;
  onReviewSnapshot: (snapshot: TwinSnapshot) => void;
  onDismiss: () => void;
  triggerFlash?: boolean;
}

export const SnapshotNotificationToast: React.FC<SnapshotNotificationToastProps> = ({
  snapshot,
  onReviewSnapshot,
  onDismiss,
  triggerFlash = true,
}) => {
  const [showFlash, setShowFlash] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(100);

  // Optical camera flash animation on capture
  useEffect(() => {
    if (snapshot && triggerFlash) {
      setShowFlash(true);
      const timer = setTimeout(() => setShowFlash(false), 250);
      return () => clearTimeout(timer);
    }
  }, [snapshot, triggerFlash]);

  // Auto-dismiss countdown (6 seconds)
  useEffect(() => {
    if (!snapshot) return;

    setProgress(100);
    const duration = 6500;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return Math.max(0, prev - step);
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [snapshot, onDismiss]);

  if (!snapshot) return null;

  const isCritical = snapshot.highestSeverity === 'critical';
  const isWarning = snapshot.highestSeverity === 'warning';
  const isManual = snapshot.triggerType === 'manual';

  return (
    <>
      {/* Visual Camera Shutter Flash Overlay */}
      {showFlash && (
        <div className="pointer-events-none fixed inset-0 z-50 bg-cyan-400/20 mix-blend-screen animate-pulse transition-opacity duration-200" />
      )}

      {/* Floating HUD Alert Toast */}
      <div
        id="snapshot-notification-toast"
        className="fixed top-18 right-4 sm:right-6 z-50 max-w-md w-[calc(100vw-2rem)] sm:w-[420px] transition-all duration-300 transform translate-y-0"
      >
        <div
          className={`relative rounded-2xl p-4 shadow-2xl backdrop-blur-xl border flex flex-col gap-3 overflow-hidden ${
            isCritical
              ? 'bg-slate-900/95 border-rose-500/60 shadow-rose-950/60'
              : isWarning
              ? 'bg-slate-900/95 border-amber-500/60 shadow-amber-950/60'
              : 'bg-slate-900/95 border-cyan-500/50 shadow-cyan-950/50'
          }`}
        >
          {/* Glowing aura background accent */}
          <div
            className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none ${
              isCritical
                ? 'bg-rose-500/20'
                : isWarning
                ? 'bg-amber-500/20'
                : 'bg-cyan-500/20'
            }`}
          />

          {/* Header Bar */}
          <div className="flex items-start justify-between gap-2 relative z-10">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-xl flex items-center justify-center shadow-md ${
                  isCritical
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                    : isWarning
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                }`}
              >
                {isCritical ? (
                  <AlertOctagon className="w-5 h-5" />
                ) : isWarning ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    {snapshot.timeFormatted}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                      isCritical
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : isWarning
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    }`}
                  >
                    {isManual ? 'Manual Snapshot' : `${snapshot.highestSeverity} Bounds Exceeded`}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5 font-mono">
                  <Camera className="w-3.5 h-3.5 text-cyan-400 inline" />
                  <span>Twin State Snapshot Captured</span>
                </h3>
              </div>
            </div>

            {/* Dismiss Button */}
            <button
              id="dismiss-snapshot-toast-btn"
              onClick={onDismiss}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Breached Metrics Pill List */}
          {snapshot.breachedMetrics.length > 0 ? (
            <div className="flex flex-col gap-1.5 bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 text-xs font-mono">
              <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-400" />
                <span>Safety Boundary Exceedances:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {snapshot.breachedMetrics.map((m, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-1 rounded-md text-[11px] border font-bold flex items-center gap-1 ${
                      m.severity === 'critical'
                        ? 'bg-rose-950/60 text-rose-300 border-rose-700/50'
                        : 'bg-amber-950/60 text-amber-300 border-amber-700/50'
                    }`}
                  >
                    <span>{m.label}:</span>
                    <strong className="underline decoration-dotted">
                      {m.actualValue.toFixed(1)}{m.unit}
                    </strong>
                    <span className="text-slate-400 font-normal">
                      (limit {m.thresholdValue.toFixed(1)}{m.unit})
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 text-xs text-slate-300 font-mono flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>Full cyber-physical parameter set frozen for offline retrospective inspection.</span>
            </div>
          )}

          {/* Quick Snapshot Details */}
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-0.5">
            <span className="truncate max-w-[200px]">{snapshot.machineryName}</span>
            <span className="text-cyan-400">
              v{snapshot.twinState.version} (Gen #{snapshot.twinState.generation})
            </span>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/70">
            <button
              id="review-snapshot-cta-btn"
              onClick={() => onReviewSnapshot(snapshot)}
              className="flex-1 py-2 px-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold font-mono flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-900/30 cursor-pointer"
            >
              <span>Retrospective Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              id="dismiss-snapshot-secondary-btn"
              onClick={onDismiss}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-mono transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>

          {/* Auto-dismiss countdown bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
            <div
              className={`h-full transition-all duration-75 ${
                isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </>
  );
};
