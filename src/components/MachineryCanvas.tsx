import React, { useEffect, useRef, useState } from 'react';
import { MachinerySpec, SubComponent, TelemetryPoint } from '../types';
import {
  Activity,
  Flame,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Crosshair,
  Wrench,
  Gauge,
  Thermometer,
  Layers,
} from 'lucide-react';

interface MachineryCanvasProps {
  spec: MachinerySpec;
  telemetry: TelemetryPoint | null;
  selectedComponent: SubComponent | null;
  onSelectComponent: (comp: SubComponent) => void;
}

export interface ComponentStress {
  comp: SubComponent;
  stress: number; // 0.0 to 1.0
  stressPct: number; // 0 to 100
  color: {
    r: number;
    g: number;
    b: number;
    rgb: string;
    rgba: (alpha: number) => string;
    glow: string;
    hex: string;
  };
  level: 'optimal' | 'moderate' | 'elevated' | 'critical';
  thermalContribution: number;
  vibrationContribution: number;
  anomalyContribution: number;
}

/**
 * Maps a calculated stress value (0.0 to 1.0) into a continuous heat map color
 * transitioning smoothly: Green (0.0) -> Yellow (0.5) -> Red (1.0)
 */
export function getStressHeatMapColor(stressValue: number) {
  const s = Math.max(0, Math.min(1, stressValue));
  let r: number, g: number, b: number;

  if (s <= 0.5) {
    // 0.0 to 0.5: Green (#10b981 / rgb(16, 185, 129)) to Yellow (#eab308 / rgb(234, 179, 8))
    const t = s / 0.5;
    r = Math.round(16 + (234 - 16) * t);
    g = Math.round(185 + (179 - 185) * t);
    b = Math.round(129 + (8 - 129) * t);
  } else {
    // 0.5 to 1.0: Yellow (#eab308 / rgb(234, 179, 8)) to Red (#ef4444 / rgb(239, 68, 68))
    const t = (s - 0.5) / 0.5;
    r = Math.round(234 + (239 - 234) * t);
    g = Math.round(179 + (68 - 179) * t);
    b = Math.round(8 + (68 - 8) * t);
  }

  const rgb = `rgb(${r}, ${g}, ${b})`;
  const rgba = (alpha: number) => `rgba(${r}, ${g}, ${b}, ${alpha})`;
  const glow = `rgba(${r}, ${g}, ${b}, 0.55)`;
  const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

  return { r, g, b, rgb, rgba, glow, hex };
}

/**
 * Calculates the dynamic operational stress level for a specific machine component
 * considering baseline health degradation, thermal rise, vibration surge, and anomaly severity.
 */
export function calculateComponentStress(
  comp: SubComponent,
  spec: MachinerySpec,
  telemetry: TelemetryPoint | null
): ComponentStress {
  const nomTemp = spec.nominalTemp || 50;
  const curTemp = telemetry?.physicalTemp ?? nomTemp;
  const nomVib = spec.nominalVibration || 1.0;
  const curVib = telemetry?.physicalVibration ?? nomVib;
  const anomalyScore = telemetry?.anomalyScore ?? 0;

  // 1. Baseline mechanical degradation (100 - healthScore)
  const healthDeficit = Math.max(0, (100 - comp.healthScore) / 100);

  // 2. Thermal stress factor: normalized rise above nominal temperature
  const tempDelta = Math.max(0, curTemp - nomTemp);
  const tempRatio = nomTemp > 0 ? tempDelta / (nomTemp * 0.45) : 0;

  // 3. Dynamic vibration & mechanical load factor: normalized rise above nominal vibration
  const vibDelta = Math.max(0, curVib - nomVib);
  const vibRatio = nomVib > 0 ? vibDelta / (nomVib * 1.25) : 0;

  // 4. Component-specific sensitivity weighting
  let tempWeight = 0.35;
  let vibWeight = 0.45;
  let anomalyWeight = 0.20;

  const id = comp.id.toLowerCase();
  if (id.includes('bearing')) {
    vibWeight = 0.55;
    tempWeight = 0.25;
    anomalyWeight = 0.20;
  } else if (id.includes('seal') || id.includes('combustor') || id.includes('cooling') || id.includes('coupling')) {
    tempWeight = 0.60;
    vibWeight = 0.20;
    anomalyWeight = 0.20;
  } else if (id.includes('impeller') || id.includes('compressor') || id.includes('blade') || id.includes('turbine')) {
    vibWeight = 0.50;
    tempWeight = 0.28;
    anomalyWeight = 0.22;
  } else if (id.includes('gear') || id.includes('carrier') || id.includes('tool') || id.includes('chuck')) {
    vibWeight = 0.52;
    tempWeight = 0.28;
    anomalyWeight = 0.20;
  }

  const thermalContrib = Math.min(1.0, tempRatio * tempWeight);
  const vibrationContrib = Math.min(1.0, vibRatio * vibWeight);
  const anomalyContrib = Math.min(1.0, anomalyScore * anomalyWeight);

  // Combined raw stress
  const rawStress = healthDeficit * 0.2 + thermalContrib + vibrationContrib + anomalyContrib;
  const stress = Math.max(0, Math.min(1.0, rawStress));
  const stressPct = Math.round(stress * 100);

  const color = getStressHeatMapColor(stress);

  let level: 'optimal' | 'moderate' | 'elevated' | 'critical' = 'optimal';
  if (stressPct >= 75) level = 'critical';
  else if (stressPct >= 50) level = 'elevated';
  else if (stressPct >= 25) level = 'moderate';

  return {
    comp,
    stress,
    stressPct,
    color,
    level,
    thermalContribution: Math.round(thermalContrib * 100),
    vibrationContribution: Math.round(vibrationContrib * 100),
    anomalyContribution: Math.round(anomalyContrib * 100),
  };
}

export const MachineryCanvas: React.FC<MachineryCanvasProps> = ({
  spec,
  telemetry,
  selectedComponent,
  onSelectComponent,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const angleRef = useRef<number>(0);

  const [hoveredCompId, setHoveredCompId] = useState<string | null>(null);

  const vibration = telemetry?.physicalVibration || spec.nominalVibration;
  const temp = telemetry?.physicalTemp || spec.nominalTemp;
  const rpm = telemetry?.rpm || spec.nominalRPM;

  // Precompute live stress for all components in current spec
  const stressMap = new Map<string, ComponentStress>();
  spec.components.forEach((c) => {
    stressMap.set(c.id, calculateComponentStress(c, spec, telemetry));
  });

  const activeFocusId = hoveredCompId || selectedComponent?.id || null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isMounted = true;

    const render = () => {
      if (!isMounted) return;

      const width = canvas.width;
      const height = canvas.height;

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // Background Engineering Grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      const gridSize = 25;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Update rotation angle based on RPM
      const rotationSpeed = (rpm / 60) * 0.05;
      angleRef.current += rotationSpeed;

      // Vibration offset (scaled slightly with current vibration)
      const vibIntensity = Math.min(4.0, vibration);
      const vibX = (Math.random() - 0.5) * vibIntensity * 1.5;
      const vibY = (Math.random() - 0.5) * vibIntensity * 1.5;

      ctx.save();
      ctx.translate(vibX, vibY);

      const centerX = width / 2;
      const centerY = height / 2;

      // Draw Main Equipment Outer Enclosure Base
      ctx.fillStyle = '#090d16';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(centerX - 240, centerY - 95, 480, 190, 14);
      ctx.fill();
      ctx.stroke();

      // Render Machinery Diagram with Stress Heat Map Colors
      if (spec.id === 'centrifugal_pump') {
        drawPumpDiagram(ctx, centerX, centerY, angleRef.current, stressMap, activeFocusId);
      } else if (spec.id === 'cnc_spindle') {
        drawSpindleDiagram(ctx, centerX, centerY, angleRef.current, stressMap, activeFocusId);
      } else if (spec.id === 'turbofan_engine') {
        drawTurbineDiagram(ctx, centerX, centerY, angleRef.current, stressMap, activeFocusId);
      } else {
        drawGearboxDiagram(ctx, centerX, centerY, angleRef.current, stressMap, activeFocusId);
      }

      ctx.restore();

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isMounted = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [spec.id, rpm, temp, vibration, telemetry, activeFocusId]);

  // --- Helper to draw an active part HUD highlight bracket & callout ---
  const drawPartHighlightBadge = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    stress: ComponentStress,
    label: string
  ) => {
    ctx.save();
    // Glowing focus bracket
    ctx.strokeStyle = stress.color.rgb;
    ctx.lineWidth = 2;
    ctx.shadowColor = stress.color.glow;
    ctx.shadowBlur = 10;

    const cornerLen = 10;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(x, y + cornerLen);
    ctx.lineTo(x, y);
    ctx.lineTo(x + cornerLen, y);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(x + w - cornerLen, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + cornerLen);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(x, y + h - cornerLen);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + cornerLen, y + h);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(x + w - cornerLen, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y + h - cornerLen);
    ctx.stroke();

    // Floating callout tag
    ctx.shadowBlur = 0;
    const badgeY = y > 60 ? y - 18 : y + h + 18;
    const text = `${label.toUpperCase()}: ${stress.stressPct}% STRESS`;
    ctx.font = 'bold 9px monospace';
    const textWidth = ctx.measureText(text).width;
    const badgeWidth = textWidth + 14;
    const badgeX = x + w / 2 - badgeWidth / 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.strokeStyle = stress.color.rgb;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY - 11, badgeWidth, 16, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = stress.color.rgb;
    ctx.fillText(text, badgeX + 7, badgeY + 1);

    ctx.restore();
  };

  // =========================================================================
  // 1. Centrifugal Pump Diagram with Dynamic Heat Map Coloring
  // =========================================================================
  const drawPumpDiagram = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    angle: number,
    stresses: Map<string, ComponentStress>,
    focusId: string | null
  ) => {
    const motorStress = stresses.get('motor') || getFallbackStress();
    const bearingStress = stresses.get('drive_bearing') || getFallbackStress();
    const sealStress = stresses.get('mech_seal') || getFallbackStress();
    const impellerStress = stresses.get('impeller') || getFallbackStress();

    // 1. Drive Shaft connecting motor to impeller
    const shaftGrad = ctx.createLinearGradient(cx - 200, cy, cx + 180, cy);
    shaftGrad.addColorStop(0, motorStress.color.rgba(0.5));
    shaftGrad.addColorStop(0.4, bearingStress.color.rgba(0.6));
    shaftGrad.addColorStop(0.7, sealStress.color.rgba(0.6));
    shaftGrad.addColorStop(1, impellerStress.color.rgba(0.7));

    ctx.fillStyle = shaftGrad;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.fillRect(cx - 200, cy - 12, 380, 24);
    ctx.strokeRect(cx - 200, cy - 12, 380, 24);

    // 2. Motor Housing & Stator Coils / Fins (Left)
    const isMotorFocused = focusId === 'motor';
    ctx.save();
    ctx.fillStyle = motorStress.color.rgba(0.22);
    ctx.strokeStyle = motorStress.color.rgb;
    ctx.lineWidth = isMotorFocused ? 3.5 : 2.5;
    if (isMotorFocused) {
      ctx.shadowColor = motorStress.color.glow;
      ctx.shadowBlur = 14;
    }
    ctx.beginPath();
    ctx.roundRect(cx - 210, cy - 70, 140, 140, 8);
    ctx.fill();
    ctx.stroke();

    // Motor Coils / Cooling Fins with Heat Map Color
    ctx.fillStyle = motorStress.color.rgba(0.6);
    ctx.strokeStyle = motorStress.color.rgba(0.9);
    ctx.lineWidth = 1;
    for (let i = -50; i <= 50; i += 18) {
      ctx.fillRect(cx - 205, cy + i, 130, 7);
      ctx.strokeRect(cx - 205, cy + i, 130, 7);
    }
    ctx.restore();

    if (isMotorFocused) {
      drawPartHighlightBadge(ctx, cx - 215, cy - 75, 150, 150, motorStress, 'Motor');
    }

    // 3. Drive Bearing Location & Balls
    const isBearingFocused = focusId === 'drive_bearing';
    ctx.save();
    // Bearing Housing / Outer Race
    ctx.fillStyle = bearingStress.color.rgba(0.35);
    ctx.strokeStyle = bearingStress.color.rgb;
    ctx.lineWidth = isBearingFocused ? 3.5 : 2.5;
    if (isBearingFocused) {
      ctx.shadowColor = bearingStress.color.glow;
      ctx.shadowBlur = 14;
    }
    ctx.beginPath();
    ctx.arc(cx - 50, cy, 27, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner race boundary
    ctx.strokeStyle = bearingStress.color.rgba(0.8);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx - 50, cy, 14, 0, Math.PI * 2);
    ctx.stroke();

    // Bearing Balls rotating with dynamic stress glow
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
      const bx = cx - 50 + Math.cos(angle + a) * 17;
      const by = cy + Math.sin(angle + a) * 17;
      ctx.fillStyle = bearingStress.color.rgb;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bx, by, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    if (isBearingFocused) {
      drawPartHighlightBadge(ctx, cx - 80, cy - 35, 60, 70, bearingStress, 'Bearing');
    }

    // 4. Mechanical Seal Block & Faces
    const isSealFocused = focusId === 'mech_seal';
    ctx.save();
    ctx.fillStyle = sealStress.color.rgba(0.35);
    ctx.strokeStyle = sealStress.color.rgb;
    ctx.lineWidth = isSealFocused ? 3 : 2;
    if (isSealFocused) {
      ctx.shadowColor = sealStress.color.glow;
      ctx.shadowBlur = 12;
    }
    ctx.fillRect(cx + 20, cy - 24, 30, 48);
    ctx.strokeRect(cx + 20, cy - 24, 30, 48);

    // Silicon Carbide Seal Faces
    ctx.strokeStyle = sealStress.color.rgb;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 28, cy - 20);
    ctx.lineTo(cx + 28, cy + 20);
    ctx.moveTo(cx + 42, cy - 20);
    ctx.lineTo(cx + 42, cy + 20);
    ctx.stroke();
    ctx.restore();

    if (isSealFocused) {
      drawPartHighlightBadge(ctx, cx + 15, cy - 30, 40, 60, sealStress, 'Mech Seal');
    }

    // 5. Volute Casing & Impeller Chamber (Right)
    const isImpellerFocused = focusId === 'impeller';
    ctx.save();
    // Volute casing chamber with stress heatmap gradient
    const voluteGrad = ctx.createRadialGradient(cx + 120, cy, 10, cx + 120, cy, 78);
    voluteGrad.addColorStop(0, impellerStress.color.rgba(0.45));
    voluteGrad.addColorStop(0.8, impellerStress.color.rgba(0.2));
    voluteGrad.addColorStop(1, impellerStress.color.rgba(0.08));

    ctx.fillStyle = voluteGrad;
    ctx.strokeStyle = impellerStress.color.rgb;
    ctx.lineWidth = isImpellerFocused ? 4 : 3;
    if (isImpellerFocused) {
      ctx.shadowColor = impellerStress.color.glow;
      ctx.shadowBlur = 16;
    }
    ctx.beginPath();
    ctx.arc(cx + 120, cy, 76, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rotating 316L Impeller Blades with dynamic heat map stroke
    ctx.save();
    ctx.translate(cx + 120, cy);
    ctx.rotate(angle);
    ctx.strokeStyle = impellerStress.color.rgb;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (let b = 0; b < 6; b++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(22, 26, 56, 10);
      ctx.stroke();
    }
    // Impeller Hub
    ctx.fillStyle = impellerStress.color.rgb;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    if (isImpellerFocused) {
      drawPartHighlightBadge(ctx, cx + 40, cy - 80, 160, 160, impellerStress, 'Impeller');
    }
  };

  // =========================================================================
  // 2. CNC Spindle Diagram with Dynamic Heat Map Coloring
  // =========================================================================
  const drawSpindleDiagram = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    angle: number,
    stresses: Map<string, ComponentStress>,
    focusId: string | null
  ) => {
    const statorStress = stresses.get('stator_cooling') || getFallbackStress();
    const bearingStress = stresses.get('ceramic_bearing') || getFallbackStress();
    const toolStress = stresses.get('tool_holder') || getFallbackStress();
    const encoderStress = stresses.get('rotary_encoder') || getFallbackStress();

    // 1. Spindle Body & Stator Cooling Jacket
    const isStatorFocused = focusId === 'stator_cooling';
    ctx.save();
    ctx.fillStyle = statorStress.color.rgba(0.2);
    ctx.strokeStyle = statorStress.color.rgb;
    ctx.lineWidth = isStatorFocused ? 3.5 : 2.5;
    if (isStatorFocused) {
      ctx.shadowColor = statorStress.color.glow;
      ctx.shadowBlur = 14;
    }
    ctx.fillRect(cx - 200, cy - 52, 360, 104);
    ctx.strokeRect(cx - 200, cy - 52, 360, 104);

    // Stator cooling fluid channels along jacket
    ctx.fillStyle = statorStress.color.rgba(0.55);
    for (let ch = -180; ch <= 120; ch += 28) {
      ctx.fillRect(cx + ch, cy - 50, 14, 8);
      ctx.fillRect(cx + ch, cy + 42, 14, 8);
    }
    ctx.restore();

    if (isStatorFocused) {
      drawPartHighlightBadge(ctx, cx - 205, cy - 56, 370, 112, statorStress, 'Stator Cooling');
    }

    // 2. Rear Optical Encoder Disk
    const isEncoderFocused = focusId === 'rotary_encoder';
    ctx.save();
    ctx.fillStyle = encoderStress.color.rgba(0.35);
    ctx.strokeStyle = encoderStress.color.rgb;
    ctx.lineWidth = isEncoderFocused ? 3 : 2;
    if (isEncoderFocused) {
      ctx.shadowColor = encoderStress.color.glow;
      ctx.shadowBlur = 12;
    }
    ctx.fillRect(cx - 215, cy - 28, 15, 56);
    ctx.strokeRect(cx - 215, cy - 28, 15, 56);

    // Encoder optical graticule tick marks
    ctx.strokeStyle = encoderStress.color.rgb;
    ctx.lineWidth = 1;
    for (let t = -24; t <= 24; t += 6) {
      ctx.beginPath();
      ctx.moveTo(cx - 214, cy + t);
      ctx.lineTo(cx - 202, cy + t);
      ctx.stroke();
    }
    ctx.restore();

    if (isEncoderFocused) {
      drawPartHighlightBadge(ctx, cx - 225, cy - 35, 35, 70, encoderStress, 'Encoder');
    }

    // 3. Ceramic Bearings (Rear & Front Sets)
    const isBearingFocused = focusId === 'ceramic_bearing';
    ctx.save();
    const bearingLocations = [
      { x: cx - 150, label: 'Rear' },
      { x: cx + 80, label: 'Front' },
    ];

    bearingLocations.forEach((loc) => {
      ctx.fillStyle = bearingStress.color.rgba(0.35);
      ctx.strokeStyle = bearingStress.color.rgb;
      ctx.lineWidth = isBearingFocused ? 3 : 2;
      if (isBearingFocused) {
        ctx.shadowColor = bearingStress.color.glow;
        ctx.shadowBlur = 12;
      }
      ctx.fillRect(loc.x, cy - 45, 30, 90);
      ctx.strokeRect(loc.x, cy - 45, 30, 90);

      // Silicon Nitride Ceramic Balls
      for (let yb = -35; yb <= 35; yb += 18) {
        ctx.fillStyle = bearingStress.color.rgb;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(loc.x + 15, cy + yb, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });
    ctx.restore();

    if (isBearingFocused) {
      drawPartHighlightBadge(ctx, cx + 70, cy - 50, 50, 100, bearingStress, 'Ceramic Bearings');
    }

    // 4. Rotating Precision Shaft
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.fillRect(cx - 200, cy - 14, 380, 28);
    ctx.strokeRect(cx - 200, cy - 14, 380, 28);

    // 5. Tool Chuck & Milling Cutter (HSK Clamping)
    const isToolFocused = focusId === 'tool_holder';
    ctx.save();
    ctx.translate(cx + 180, cy);
    ctx.rotate(angle);

    // Hydraulic Tool Chuck
    ctx.fillStyle = toolStress.color.rgba(0.35);
    ctx.strokeStyle = toolStress.color.rgb;
    ctx.lineWidth = isToolFocused ? 3 : 2;
    if (isToolFocused) {
      ctx.shadowColor = toolStress.color.glow;
      ctx.shadowBlur = 14;
    }
    ctx.fillRect(0, -25, 35, 50);
    ctx.strokeRect(0, -25, 35, 50);

    // Milling Tool Flutes / Cutter
    ctx.fillStyle = toolStress.color.rgb;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(35, -12);
    ctx.lineTo(80, -3);
    ctx.lineTo(80, 3);
    ctx.lineTo(35, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    if (isToolFocused) {
      drawPartHighlightBadge(ctx, cx + 175, cy - 35, 95, 70, toolStress, 'Tool Holder');
    }
  };

  // =========================================================================
  // 3. Turbofan Engine / Gas Turbine Diagram with Dynamic Heat Map Coloring
  // =========================================================================
  const drawTurbineDiagram = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    angle: number,
    stresses: Map<string, ComponentStress>,
    focusId: string | null
  ) => {
    const compStress = stresses.get('hp_compressor') || getFallbackStress();
    const combustorStress = stresses.get('combustor') || getFallbackStress();
    const bearingStress = stresses.get('journal_bearing') || getFallbackStress();
    const turbineStress = stresses.get('turbine_stage') || getFallbackStress();

    // 1. Outer Turbine & Compressor Enclosure
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 220, cy - 70);
    ctx.lineTo(cx - 40, cy - 45);
    ctx.lineTo(cx + 80, cy - 45);
    ctx.lineTo(cx + 200, cy - 75);
    ctx.lineTo(cx + 200, cy + 75);
    ctx.lineTo(cx + 80, cy + 45);
    ctx.lineTo(cx - 40, cy + 45);
    ctx.lineTo(cx - 220, cy + 70);
    ctx.closePath();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.fill();
    ctx.stroke();

    // 2. High-Pressure Compressor Section (Front Left)
    const isCompFocused = focusId === 'hp_compressor';
    ctx.save();
    ctx.fillStyle = compStress.color.rgba(0.25);
    ctx.strokeStyle = compStress.color.rgb;
    ctx.lineWidth = isCompFocused ? 3.5 : 2.5;
    if (isCompFocused) {
      ctx.shadowColor = compStress.color.glow;
      ctx.shadowBlur = 14;
    }
    // Compressor casing outline
    ctx.beginPath();
    ctx.moveTo(cx - 220, cy - 68);
    ctx.lineTo(cx - 50, cy - 45);
    ctx.lineTo(cx - 50, cy + 45);
    ctx.lineTo(cx - 220, cy + 68);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Rotating Titanium Compressor Blades
    ctx.save();
    ctx.translate(cx - 135, cy);
    ctx.rotate(angle);
    ctx.strokeStyle = compStress.color.rgb;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -50);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();

    if (isCompFocused) {
      drawPartHighlightBadge(ctx, cx - 225, cy - 72, 180, 144, compStress, 'Compressor');
    }

    // 3. Combustor Section & Heat Glow (Center)
    const isCombustorFocused = focusId === 'combustor';
    ctx.save();
    // Combustor casing
    ctx.fillStyle = combustorStress.color.rgba(0.3);
    ctx.strokeStyle = combustorStress.color.rgb;
    ctx.lineWidth = isCombustorFocused ? 3.5 : 2.5;
    if (isCombustorFocused) {
      ctx.shadowColor = combustorStress.color.glow;
      ctx.shadowBlur = 16;
    }
    ctx.fillRect(cx - 45, cy - 42, 115, 84);
    ctx.strokeRect(cx - 45, cy - 42, 115, 84);

    // Dynamic combustion flame glow modulated by combustor stress heat map
    const flameGrad = ctx.createRadialGradient(cx + 12, cy, 4, cx + 12, cy, 55);
    flameGrad.addColorStop(0, combustorStress.color.rgba(0.85));
    flameGrad.addColorStop(0.5, combustorStress.color.rgba(0.45));
    flameGrad.addColorStop(1, combustorStress.color.rgba(0.0));

    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.arc(cx + 12, cy, 55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (isCombustorFocused) {
      drawPartHighlightBadge(ctx, cx - 50, cy - 48, 125, 96, combustorStress, 'Combustor');
    }

    // 4. Tilting-Pad Journal Bearing Support
    const isBearingFocused = focusId === 'journal_bearing';
    ctx.save();
    ctx.fillStyle = bearingStress.color.rgba(0.4);
    ctx.strokeStyle = bearingStress.color.rgb;
    ctx.lineWidth = isBearingFocused ? 3 : 2;
    if (isBearingFocused) {
      ctx.shadowColor = bearingStress.color.glow;
      ctx.shadowBlur = 12;
    }
    ctx.fillRect(cx - 65, cy - 18, 18, 36);
    ctx.strokeRect(cx - 65, cy - 18, 18, 36);
    ctx.fillRect(cx + 72, cy - 18, 18, 36);
    ctx.strokeRect(cx + 72, cy - 18, 18, 36);
    ctx.restore();

    if (isBearingFocused) {
      drawPartHighlightBadge(ctx, cx - 70, cy - 25, 165, 50, bearingStress, 'Journal Bearing');
    }

    // 5. Turbine Stage Rotor (Rear Right Hot Section)
    const isTurbineFocused = focusId === 'turbine_stage';
    ctx.save();
    ctx.fillStyle = turbineStress.color.rgba(0.28);
    ctx.strokeStyle = turbineStress.color.rgb;
    ctx.lineWidth = isTurbineFocused ? 3.5 : 2.5;
    if (isTurbineFocused) {
      ctx.shadowColor = turbineStress.color.glow;
      ctx.shadowBlur = 14;
    }
    // Turbine hot section casing
    ctx.beginPath();
    ctx.moveTo(cx + 75, cy - 45);
    ctx.lineTo(cx + 200, cy - 74);
    ctx.lineTo(cx + 200, cy + 74);
    ctx.lineTo(cx + 75, cy + 45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Rotating Turbine Blades
    ctx.save();
    ctx.translate(cx + 145, cy);
    ctx.rotate(angle);
    ctx.strokeStyle = turbineStress.color.rgb;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (let t = 0; t < 10; t++) {
      ctx.rotate(Math.PI / 5);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -56);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();

    if (isTurbineFocused) {
      drawPartHighlightBadge(ctx, cx + 70, cy - 78, 135, 156, turbineStress, 'Turbine Stage');
    }
  };

  // =========================================================================
  // 4. Planetary Gearbox Diagram with Dynamic Heat Map Coloring
  // =========================================================================
  const drawGearboxDiagram = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    angle: number,
    stresses: Map<string, ComponentStress>,
    focusId: string | null
  ) => {
    const sunStress = stresses.get('sun_gear') || getFallbackStress();
    const carrierStress = stresses.get('planet_carrier') || getFallbackStress();
    const couplingStress = stresses.get('fluid_coupling') || getFallbackStress();
    const shaftStress = stresses.get('output_shaft') || getFallbackStress();

    // 1. Fluid Coupling & Outer Ring Gear Enclosure
    const isCouplingFocused = focusId === 'fluid_coupling';
    ctx.save();
    ctx.fillStyle = couplingStress.color.rgba(0.2);
    ctx.strokeStyle = couplingStress.color.rgb;
    ctx.lineWidth = isCouplingFocused ? 6 : 4.5;
    if (isCouplingFocused) {
      ctx.shadowColor = couplingStress.color.glow;
      ctx.shadowBlur = 16;
    }
    ctx.beginPath();
    ctx.arc(cx - 30, cy, 78, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ring gear internal teeth notches
    ctx.strokeStyle = couplingStress.color.rgba(0.8);
    ctx.lineWidth = 2;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
      const x1 = cx - 30 + Math.cos(a) * 78;
      const y1 = cy + Math.sin(a) * 78;
      const x2 = cx - 30 + Math.cos(a) * 70;
      const y2 = cy + Math.sin(a) * 70;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();

    if (isCouplingFocused) {
      drawPartHighlightBadge(ctx, cx - 115, cy - 85, 170, 170, couplingStress, 'Fluid Coupling');
    }

    // 2. Output Shaft & Rigid Flange Coupling (Right)
    const isShaftFocused = focusId === 'output_shaft';
    ctx.save();
    ctx.fillStyle = shaftStress.color.rgba(0.35);
    ctx.strokeStyle = shaftStress.color.rgb;
    ctx.lineWidth = isShaftFocused ? 3.5 : 2.5;
    if (isShaftFocused) {
      ctx.shadowColor = shaftStress.color.glow;
      ctx.shadowBlur = 12;
    }
    // Main output drive shaft
    ctx.fillRect(cx + 50, cy - 16, 130, 32);
    ctx.strokeRect(cx + 50, cy - 16, 130, 32);

    // Bolted Output Flange
    ctx.fillRect(cx + 170, cy - 40, 24, 80);
    ctx.strokeRect(cx + 170, cy - 40, 24, 80);

    // Flange bolts
    ctx.fillStyle = '#ffffff';
    [-28, -10, 10, 28].forEach((by) => {
      ctx.beginPath();
      ctx.arc(cx + 182, cy + by, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    if (isShaftFocused) {
      drawPartHighlightBadge(ctx, cx + 45, cy - 45, 155, 90, shaftStress, 'Output Shaft');
    }

    // 3. Planet Carrier Arms & 4 Rotating Planetary Gears
    const isCarrierFocused = focusId === 'planet_carrier';
    ctx.save();
    ctx.translate(cx - 30, cy);
    ctx.rotate(angle * 0.4); // Carrier rotates slower

    // Carrier spider arms
    ctx.strokeStyle = carrierStress.color.rgba(0.65);
    ctx.lineWidth = isCarrierFocused ? 5 : 3.5;
    for (let p = 0; p < 4; p++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(48, 0);
      ctx.stroke();
    }

    // 4 Rotating Planetary Gears
    for (let p = 0; p < 4; p++) {
      ctx.rotate(Math.PI / 2);
      ctx.save();
      ctx.translate(48, 0);
      ctx.rotate(-angle * 1.2); // Planets counter-rotate

      ctx.fillStyle = carrierStress.color.rgba(0.45);
      ctx.strokeStyle = carrierStress.color.rgb;
      ctx.lineWidth = isCarrierFocused ? 3 : 2;
      if (isCarrierFocused) {
        ctx.shadowColor = carrierStress.color.glow;
        ctx.shadowBlur = 10;
      }
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Planet gear teeth
      ctx.strokeStyle = carrierStress.color.rgb;
      ctx.lineWidth = 1.5;
      for (let g = 0; g < Math.PI * 2; g += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(g) * 14, Math.sin(g) * 14);
        ctx.lineTo(Math.cos(g) * 19, Math.sin(g) * 19);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();

    if (isCarrierFocused) {
      drawPartHighlightBadge(ctx, cx - 95, cy - 65, 130, 130, carrierStress, 'Planet Carrier');
    }

    // 4. Center Sun Gear (High-Speed Core)
    const isSunFocused = focusId === 'sun_gear';
    ctx.save();
    ctx.translate(cx - 30, cy);
    ctx.rotate(angle);

    ctx.fillStyle = sunStress.color.rgba(0.5);
    ctx.strokeStyle = sunStress.color.rgb;
    ctx.lineWidth = isSunFocused ? 4 : 2.5;
    if (isSunFocused) {
      ctx.shadowColor = sunStress.color.glow;
      ctx.shadowBlur = 14;
    }
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Sun gear teeth
    ctx.strokeStyle = sunStress.color.rgb;
    ctx.lineWidth = 2;
    for (let s = 0; s < Math.PI * 2; s += Math.PI / 5) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(s) * 16, Math.sin(s) * 16);
      ctx.lineTo(Math.cos(s) * 23, Math.sin(s) * 23);
      ctx.stroke();
    }
    ctx.restore();

    if (isSunFocused) {
      drawPartHighlightBadge(ctx, cx - 60, cy - 30, 60, 60, sunStress, 'Sun Gear');
    }
  };

  const getFallbackStress = (): ComponentStress => {
    const color = getStressHeatMapColor(0.1);
    return {
      comp: spec.components[0],
      stress: 0.1,
      stressPct: 10,
      color,
      level: 'optimal',
      thermalContribution: 4,
      vibrationContribution: 4,
      anomalyContribution: 2,
    };
  };

  // Compute highest stressed part in current machine
  let maxStressedComp: ComponentStress | null = null;
  stressMap.forEach((cs) => {
    if (!maxStressedComp || cs.stress > maxStressedComp.stress) {
      maxStressedComp = cs;
    }
  });

  const activeComponentStress = selectedComponent ? stressMap.get(selectedComponent.id) : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
      {/* Canvas Header & Interactive Component Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-cyan-400" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                {spec.name} Schematic
              </h2>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 border border-slate-700 text-cyan-300">
                Stress Heat Map Active
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Dynamic physical stress visualization with green-to-yellow-to-red thermal & mechanical transitions
            </p>
          </div>
        </div>

        {/* Live Operating Readings */}
        <div className="flex items-center gap-3 text-xs font-mono flex-wrap">
          <span className="flex items-center gap-1 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            RPM: <strong className="text-cyan-300">{rpm}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1 text-slate-300">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Temp: <strong className={`${temp > 75 ? 'text-amber-400' : 'text-emerald-400'}`}>{temp.toFixed(1)}°C</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1 text-slate-300">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            Vib: <strong className={`${vibration > 3.0 ? 'text-rose-400' : 'text-blue-300'}`}>{vibration.toFixed(2)} mm/s</strong>
          </span>
        </div>
      </div>

      {/* Heat Map Scale Legend Banner */}
      <div className="bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-300 font-bold">Stress Heat Map Scale:</span>
        </div>

        {/* Continuous Gradient Bar: Green -> Yellow -> Red */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            0% Nominal
          </span>
          <div className="w-32 sm:w-44 h-2.5 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 shadow-inner relative" />
          <span className="text-[10px] text-amber-400 font-semibold">50% Warning</span>
          <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            100% Critical
          </span>
        </div>

        {/* Highest Stress Sensor Indicator */}
        {maxStressedComp && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400">Peak Load Part:</span>
            <span
              className="px-1.5 py-0.5 rounded font-bold border flex items-center gap-1"
              style={{
                backgroundColor: maxStressedComp.color.rgba(0.18),
                color: maxStressedComp.color.hex,
                borderColor: maxStressedComp.color.rgba(0.4),
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: maxStressedComp.color.hex }}
              />
              {maxStressedComp.comp.name.split(' ')[0]}: {maxStressedComp.stressPct}%
            </span>
          </div>
        )}
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800 aspect-[16/9] sm:aspect-[21/9] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={640}
          height={260}
          className="w-full h-full object-contain cursor-crosshair"
        />

        {/* Dynamic Overlaid Sub-Component Click Targets with Live Stress Badges */}
        <div className="absolute inset-0 p-3 pointer-events-none flex items-end justify-center">
          <div className="pointer-events-auto flex items-center gap-1.5 flex-wrap justify-center bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl">
            <span className="text-[10px] text-slate-400 font-mono uppercase px-1.5">Components:</span>
            {spec.components.map((comp) => {
              const isSelected = selectedComponent?.id === comp.id;
              const isHovered = hoveredCompId === comp.id;
              const stressInfo = stressMap.get(comp.id);
              const badgeColor = stressInfo?.color.hex || '#10b981';
              const stressPct = stressInfo?.stressPct ?? 0;

              return (
                <button
                  key={comp.id}
                  onClick={() => onSelectComponent(comp)}
                  onMouseEnter={() => setHoveredCompId(comp.id)}
                  onMouseLeave={() => setHoveredCompId(null)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 text-white font-bold ring-2 ring-cyan-400 shadow-lg'
                      : isHovered
                      ? 'bg-slate-800 text-slate-100 border border-slate-600'
                      : 'bg-slate-950/80 text-slate-300 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full transition-colors"
                    style={{ backgroundColor: badgeColor }}
                  />
                  <span>{comp.name.split(' ')[0]}</span>
                  <span
                    className="text-[10px] px-1 py-0.2 rounded font-bold transition-colors"
                    style={{
                      color: badgeColor,
                      backgroundColor: stressInfo?.color.rgba(0.18) || 'transparent',
                    }}
                  >
                    {stressPct}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Component Inspection Card with Detailed Calculated Stress Meter */}
      {selectedComponent && activeComponentStress && (
        <div className="bg-slate-800/80 border border-cyan-500/30 rounded-xl p-3.5 text-xs text-slate-200 flex flex-col gap-3 animate-fadeIn font-mono">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className="p-2 rounded-lg border transition-colors"
                style={{
                  backgroundColor: activeComponentStress.color.rgba(0.15),
                  color: activeComponentStress.color.hex,
                  borderColor: activeComponentStress.color.rgba(0.35),
                }}
              >
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{selectedComponent.name}</span>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] uppercase font-bold border transition-colors"
                    style={{
                      backgroundColor: activeComponentStress.color.rgba(0.18),
                      color: activeComponentStress.color.hex,
                      borderColor: activeComponentStress.color.rgba(0.35),
                    }}
                  >
                    {activeComponentStress.level} stress ({activeComponentStress.stressPct}%)
                  </span>
                </div>
                <p className="text-slate-400 mt-0.5 text-[11px] font-sans">{selectedComponent.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 self-end sm:self-auto">
              <div>
                <span className="text-slate-400 block text-[10px]">LOCAL TEMP</span>
                <span className="text-slate-100 font-bold">{selectedComponent.temperature}°C</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">RMS VIBRATION</span>
                <span className="text-cyan-300 font-bold">{selectedComponent.vibrationRMS} mm/s</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">HEALTH SCORE</span>
                <span className="text-emerald-400 font-bold">{selectedComponent.healthScore}%</span>
              </div>
            </div>
          </div>

          {/* Dynamic Stress Progress Meter with Heat Map Gradient */}
          <div className="pt-2 border-t border-slate-700/60 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                Calculated Operational Stress Level:
              </span>
              <span
                className="font-bold text-xs"
                style={{ color: activeComponentStress.color.hex }}
              >
                {activeComponentStress.stressPct}% Total Stress
              </span>
            </div>

            {/* Meter Bar */}
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700 flex relative">
              {/* Heat Map Gradient Bar Fill */}
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${activeComponentStress.stressPct}%`,
                  backgroundColor: activeComponentStress.color.hex,
                  boxShadow: `0 0 10px ${activeComponentStress.color.glow}`,
                }}
              />
            </div>

            {/* Stress Source Decomposition Chips */}
            <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5 flex-wrap">
              <span>Stress Contributors:</span>
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                Thermal Stress: <strong className="text-slate-200">+{activeComponentStress.thermalContribution}%</strong>
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-blue-400" />
                Dynamic Vib Load: <strong className="text-slate-200">+{activeComponentStress.vibrationContribution}%</strong>
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-400" />
                Anomaly Residual: <strong className="text-slate-200">+{activeComponentStress.anomalyContribution}%</strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

