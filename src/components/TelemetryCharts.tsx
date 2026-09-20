import React, { useState } from 'react';
import {
  FFTSpectrumPoint,
  OrbitPoint,
  TelemetryPoint,
} from '../types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  ScatterChart,
  Scatter,
  Cell,
} from 'recharts';
import { Activity, BarChart2, Radio, Compass, RefreshCw } from 'lucide-react';

interface TelemetryChartsProps {
  telemetryHistory: TelemetryPoint[];
  fftSpectrum: FFTSpectrumPoint[];
  orbit: OrbitPoint[];
  fitAccuracy: number;
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({
  telemetryHistory,
  fftSpectrum,
  orbit,
  fitAccuracy,
}) => {
  const [activeTab, setActiveTab] = useState<'stream' | 'residuals' | 'fft' | 'orbit'>('stream');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
      {/* Tab Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
            Telemetry & Physics Signal Processing
          </h2>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('stream')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'stream'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Vibration Stream</span>
          </button>

          <button
            onClick={() => setActiveTab('residuals')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'residuals'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Residual Error</span>
          </button>

          <button
            onClick={() => setActiveTab('fft')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'fft'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>FFT Spectrum</span>
          </button>

          <button
            onClick={() => setActiveTab('orbit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'orbit'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Shaft Orbit</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Real-Time Vibration Stream Comparison */}
      {activeTab === 'stream' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
            <span>Comparison: Physical Machine vs. Static Baseline Twin vs. Self-Evolved Twin</span>
            <span className="text-emerald-400 font-bold">Evolved Model Fit: {fitAccuracy.toFixed(1)}%</span>
          </div>

          <div className="h-64 w-full bg-slate-950/60 p-2 rounded-xl border border-slate-800">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetryHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timeFormatted" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 'auto']} unit=" mm/s" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line
                  type="monotone"
                  dataKey="physicalVibration"
                  name="Physical Sensor (Observed)"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="nominalTwinVibration"
                  name="Nominal Twin (Un-calibrated)"
                  stroke="#64748b"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="evolvedTwinVibration"
                  name="Evolved Twin (Self-Calibrated)"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab 2: Model Residual Error Reduction */}
      {activeTab === 'residuals' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
            <span>State Prediction Deviation Residuals (|Physical - Model|)</span>
            <span className="text-cyan-300 font-semibold">Lower Residual = Higher Model Precision</span>
          </div>

          <div className="h-64 w-full bg-slate-950/60 p-2 rounded-xl border border-slate-800">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetryHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timeFormatted" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line
                  type="monotone"
                  dataKey="residualErrorNominal"
                  name="Nominal Twin Residual (High Error Drift)"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="residualErrorEvolved"
                  name="Evolved Twin Residual (Learned Precision)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab 3: Fast Fourier Transform (FFT) Frequency Spectrum */}
      {activeTab === 'fft' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
            <span>Fast Fourier Transform (FFT) Vibration Harmonics Spectrum (0 - 500 Hz)</span>
            <span className="text-amber-400 font-mono text-[10px]">Harmonic Peak Detection Active</span>
          </div>

          <div className="h-64 w-full bg-slate-950/60 p-2 rounded-xl border border-slate-800">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fftSpectrum}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="frequency" stroke="#64748b" tick={{ fontSize: 10 }} unit="Hz" />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit="g" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
                  formatter={(val: any, _name: any, props: any) => [
                    `${val} g RMS`,
                    props.payload.harmonicLabel ? `Label: ${props.payload.harmonicLabel}` : 'Magnitude',
                  ]}
                />
                <Bar dataKey="magnitude" name="Spectral Magnitude">
                  {fftSpectrum.map((entry, index) => {
                    const isHarmonic = !!entry.harmonicLabel;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isHarmonic ? '#f59e0b' : entry.magnitude > 1.5 ? '#ef4444' : '#0284c7'}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab 4: Shaft Orbit / Lissajous Orbit Plot */}
      {activeTab === 'orbit' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
            <span>Shaft Centerline Lissajous Orbit Displacement (X vs. Y axis displacement in µm)</span>
            <span className="text-cyan-400 font-mono text-[10px]">Centerline Ellipticity Analysis</span>
          </div>

          <div className="h-64 w-full bg-slate-950/60 p-2 rounded-xl border border-slate-800 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" dataKey="x" name="X Displacement" stroke="#64748b" tick={{ fontSize: 10 }} domain={[-3, 3]} />
                <YAxis type="number" dataKey="y" name="Y Displacement" stroke="#64748b" tick={{ fontSize: 10 }} domain={[-3, 3]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
                />
                <Scatter name="Shaft Centerline" data={orbit} fill="#38bdf8" line={{ stroke: '#0284c7', strokeWidth: 1.5 }} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
