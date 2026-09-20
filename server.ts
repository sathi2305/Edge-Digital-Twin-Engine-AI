import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// Server-side Gemini initialization
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", edgeNode: "online", timestamp: new Date().toISOString() });
});

// Self-Evolving Digital Twin Analysis & Parameter Evolution Endpoint
app.post("/api/evolve-twin", async (req, res) => {
  try {
    const { machineryName, machineryType, anomalyConfig, recentTelemetry, fftPeaks, currentParams } = req.body;

    const ai = getGeminiClient();

    const prompt = `
You are an expert Edge-Native Cyber-Physical Digital Twin Calibration Engine for industrial machinery.

Target Machine: ${machineryName} (${machineryType})
Active Anomaly/Simulation Condition: ${anomalyConfig?.type || 'None'} (Severity: ${anomalyConfig?.severity || 0}%)

Current Physical Parameters:
- Damping Coefficient beta: ${currentParams?.dampingCoeff} N*s/m
- Bearing Clearance c: ${currentParams?.bearingClearance} microns
- Friction Coeff mu: ${currentParams?.frictionCoeff}
- Thermal Dissipation k_th: ${currentParams?.thermalDissipation} W/K
- Alignment Angle theta: ${currentParams?.alignmentAngle} deg
- Unbalance Mass m_e: ${currentParams?.unbalanceMass} g*mm
- Rotor Stiffness k_r: ${currentParams?.rotorStiffness} kN/mm

Recent Edge Telemetry Summary (Last 10 samples):
${JSON.stringify((recentTelemetry || []).slice(-10), null, 2)}

FFT Frequency Harmonics Peak Data:
${JSON.stringify(fftPeaks || [], null, 2)}

Task:
Perform a full Edge-Native Digital Twin Self-Evolution pass.
Analyze sensor drift, harmonic spectrum, residual errors between physical observations and baseline twin physics.
Synthesize tuned physical parameters, updated dynamic state differential equations, predictive RUL hours, an edge C/WASM rule function, and a prescriptive maintenance work order.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an autonomous edge digital twin AI calibration engine. Output strict structured JSON with accurate engineering physics calculations.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            diagnosticSummary: { type: Type.STRING },
            rootCauseAnalysis: { type: Type.STRING },
            detectedFaultType: { type: Type.STRING },
            recommendedParams: {
              type: Type.OBJECT,
              properties: {
                dampingCoeff: { type: Type.NUMBER },
                bearingClearance: { type: Type.NUMBER },
                frictionCoeff: { type: Type.NUMBER },
                thermalDissipation: { type: Type.NUMBER },
                alignmentAngle: { type: Type.NUMBER },
                unbalanceMass: { type: Type.NUMBER },
                rotorStiffness: { type: Type.NUMBER },
              },
              required: [
                "dampingCoeff",
                "bearingClearance",
                "frictionCoeff",
                "thermalDissipation",
                "alignmentAngle",
                "unbalanceMass",
                "rotorStiffness",
              ],
            },
            fitScoreEstimate: { type: Type.NUMBER, description: "Accuracy match percentage 0-100" },
            rulHours: { type: Type.NUMBER, description: "Remaining useful life in operating hours" },
            maintenanceUrgency: { type: Type.STRING, description: "low | medium | high | critical" },
            updatedEquationsLaTeX: { type: Type.STRING, description: "Differential state equations e.g. m\\ddot{x} + \\beta\\dot{x} + kx = F" },
            edgeRule: {
              type: Type.OBJECT,
              properties: {
                condition: { type: Type.STRING },
                action: { type: Type.STRING },
              },
              required: ["condition", "action"],
            },
            edgeCodeSnippetC: { type: Type.STRING, description: "Valid C code for micro-controller/WASM edge runtime" },
            recommendedWorkOrder: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                actionItems: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                sparesRequired: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                estimatedHours: { type: Type.NUMBER },
              },
              required: ["title", "actionItems", "sparesRequired", "estimatedHours"],
            },
          },
          required: [
            "diagnosticSummary",
            "rootCauseAnalysis",
            "detectedFaultType",
            "recommendedParams",
            "fitScoreEstimate",
            "rulHours",
            "maintenanceUrgency",
            "updatedEquationsLaTeX",
            "edgeRule",
            "edgeCodeSnippetC",
            "recommendedWorkOrder",
          ],
        },
      },
    });

    const jsonText = response.text ? response.text.trim() : "{}";
    const result = JSON.parse(jsonText);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Self-Evolution API Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to execute Digital Twin self-evolution pass.",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Edge Digital Twin] Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
