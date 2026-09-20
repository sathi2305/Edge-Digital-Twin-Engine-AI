import React from 'react';
import { Cpu, Radio, Network, Database, Server, CheckCircle2, Zap, ArrowRight, Shield } from 'lucide-react';

export const EdgeNodeTopology: React.FC = () => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Edge-Native Architecture & Hardware Topology
            </h2>
            <p className="text-xs text-slate-400">Ultra-Low Latency Edge Physics Kernel & Bandwidth Optimization</p>
          </div>
        </div>

        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          OPC-UA / MQTT Active
        </span>
      </div>

      {/* Edge Architecture Diagram Flow */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-xs">
        {/* Layer 1: Sensors */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-cyan-400 font-bold border-b border-slate-800 pb-2">
            <Radio className="w-4 h-4" />
            <span>1. Field Sensor Bus</span>
          </div>

          <div className="my-2 space-y-1.5 text-[11px] text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Accelerometer:</span>
              <span>100 Hz IO-Link</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Thermocouple:</span>
              <span>Pt100 4-20mA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Shaft Encoder:</span>
              <span>Optical 4096 PPR</span>
            </div>
          </div>

          <span className="text-[10px] text-slate-500 block text-center bg-slate-900 py-1 rounded">
            Raw Telemetry Bandwidth: 12.4 MB/s
          </span>
        </div>

        {/* Layer 2: Edge Physics WASM Kernel */}
        <div className="p-3 bg-slate-950 rounded-xl border border-cyan-500/40 shadow-lg shadow-cyan-500/5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-cyan-300 font-bold border-b border-slate-800 pb-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>2. Edge Twin WASM Kernel</span>
          </div>

          <div className="my-2 space-y-1.5 text-[11px] text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Exec Latency:</span>
              <span className="text-emerald-400 font-bold">1.8 ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">RAM Footprint:</span>
              <span className="text-cyan-300 font-bold">14.2 MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Hardware:</span>
              <span>PLC / Industrial IPC</span>
            </div>
          </div>

          <span className="text-[10px] text-cyan-400 font-bold block text-center bg-cyan-500/10 py-1 rounded border border-cyan-500/20">
            Real-Time Physics Evaluation
          </span>
        </div>

        {/* Layer 3: Autonomous Adaptation Loop */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-amber-400 font-bold border-b border-slate-800 pb-2">
            <Zap className="w-4 h-4" />
            <span>3. Self-Evolution Loop</span>
          </div>

          <div className="my-2 space-y-1.5 text-[11px] text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Residual Engine:</span>
              <span>Residual Minimizer</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Trigger Mode:</span>
              <span>Auto-Calibrate</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">AI Synthesizer:</span>
              <span className="text-cyan-300">Gemini 3.6 Flash</span>
            </div>
          </div>

          <span className="text-[10px] text-amber-300 block text-center bg-amber-500/10 py-1 rounded border border-amber-500/20">
            Parameter Drift Adaptation
          </span>
        </div>

        {/* Layer 4: Cloud Enterprise Sync */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-emerald-400 font-bold border-b border-slate-800 pb-2">
            <Server className="w-4 h-4" />
            <span>4. Cloud Enterprise Sync</span>
          </div>

          <div className="my-2 space-y-1.5 text-[11px] text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Protocol:</span>
              <span>OPC-UA over TSN</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Data Transferred:</span>
              <span>State Vector Only</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Savings Ratio:</span>
              <span className="text-emerald-400 font-bold">99.4% Saved</span>
            </div>
          </div>

          <span className="text-[10px] text-emerald-400 block text-center bg-emerald-500/10 py-1 rounded border border-emerald-500/20">
            Filtered State Synchronization
          </span>
        </div>
      </div>
    </div>
  );
};
