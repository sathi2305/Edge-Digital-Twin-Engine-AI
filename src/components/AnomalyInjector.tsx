import React from 'react';
import { AnomalyConfig, AnomalyType } from '../types';
import { AlertTriangle, Flame, ShieldAlert, Zap, RefreshCw, X } from 'lucide-react';

interface AnomalyInjectorProps {
  isOpen: boolean;
  onClose: () => void;
  config: AnomalyConfig;
  onChangeConfig: (newConfig: AnomalyConfig) => void;
}

export const AnomalyInjector: React.FC<AnomalyInjectorProps> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
}) => {
  if (!isOpen) return null;

  const faultTypes: { type: AnomalyType; title: string; desc: string; icon: any }[] = [
    { type: 'none', title: 'Nominal Condition', desc: 'Baseline physical machinery operation with standard manufacturing tolerances', icon: Zap },
    { type: 'unbalance', title: 'Rotor Unbalance', desc: 'Mass eccentricity creating strong 1X RPM sinusoidal radial vibration forces', icon: RefreshCw },
    { type: 'bearing_outer_race', title: 'Bearing Outer Race Defect', desc: 'Local pitted spall causing high-frequency BPFO impact pulse harmonics', icon: ShieldAlert },
    { type: 'shaft_misalignment', title: 'Shaft Misalignment', desc: 'Angular/parallel drive shaft offset producing 2X and 3X RPM axial harmonics', icon: AlertTriangle },
    { type: 'lubrication_degradation', title: 'Lubrication Breakdown', desc: 'Oil film thinning raising dry contact friction and thermal dissipation strain', icon: Flame },
    { type: 'thermal_runaway', title: 'Thermal Overload', desc: 'Friction expansion pinching bearing clearances and causing thermal runaway', icon: Flame },
  ];

  const applyPreset = (type: AnomalyType, severity: number, description: string) => {
    onChangeConfig({
      type,
      severity,
      rateOfChange: 1.0,
      description,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-white font-mono uppercase">
                Physical Fault & Degradation Simulator
              </h2>
              <p className="text-xs text-slate-400">Inject Industrial Anomalies to Observe Digital Twin Adaptation</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex flex-col gap-5">
          {/* Preset Buttons */}
          <div>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
              Industrial Fault Presets
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => applyPreset('none', 0, 'Nominal State')}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-slate-200 transition-all cursor-pointer"
              >
                1. Healthy Machine
              </button>
              <button
                onClick={() => applyPreset('bearing_outer_race', 65, '500-Hour Bearing Race Wear')}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-amber-300 transition-all cursor-pointer"
              >
                2. Bearing Race Wear
              </button>
              <button
                onClick={() => applyPreset('unbalance', 75, 'Mass Unbalance Shock')}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-cyan-300 transition-all cursor-pointer"
              >
                3. Rotor Unbalance
              </button>
              <button
                onClick={() => applyPreset('lubrication_degradation', 85, 'Severe Oil Film Loss')}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-rose-300 transition-all cursor-pointer"
              >
                4. Lubrication Loss
              </button>
            </div>
          </div>

          {/* Fault Type Selection */}
          <div>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
              Select Anomaly Type
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {faultTypes.map((item) => {
                const isSelected = config.type === item.type;
                const IconComponent = item.icon;

                return (
                  <button
                    key={item.type}
                    onClick={() =>
                      onChangeConfig({
                        ...config,
                        type: item.type,
                        severity: item.type === 'none' ? 0 : Math.max(30, config.severity),
                        description: item.title,
                      })
                    }
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/80'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg text-xs ${
                        isSelected ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div>
                      <span className={`text-xs font-bold font-mono block ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                        {item.title}
                      </span>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fault Severity Slider */}
          {config.type !== 'none' && (
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-2 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold">Fault Severity Level</span>
                <span className="text-amber-400 font-bold">{config.severity}%</span>
              </div>

              <input
                type="range"
                min="10"
                max="100"
                value={config.severity}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    severity: parseInt(e.target.value, 10),
                  })
                }
                className="w-full accent-amber-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Minor Drift (10%)</span>
                <span>Moderate Wear (50%)</span>
                <span>Critical Failure (100%)</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs font-mono transition-colors cursor-pointer"
          >
            Apply Fault Simulation
          </button>
        </div>
      </div>
    </div>
  );
};
