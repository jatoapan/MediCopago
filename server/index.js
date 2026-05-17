// import express from 'express';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import { GoogleGenerativeAI } from '@google/generative-ai';

// dotenv.config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// const PORT = Number(process.env.PORT || 3001);
// const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
// const genAI = hasGeminiKey ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
// const GEMINI_MODELS = [
//   process.env.GEMINI_MODEL,
//   'gemini-1.5-flash',
//   'gemini-pro',
// ].filter(Boolean);

// async function tryGeminiModels(prompt) {
//   if (!genAI) {
//     throw new Error('Gemini no está inicializado');
//   }

//   let lastError = null;

//   for (const modelName of GEMINI_MODELS) {
//     try {
//       console.log(`[Gemini] intentando modelo: ${modelName}`);
//       const model = genAI.getGenerativeModel({ model: modelName });
//       const result = await model.generateContent(prompt);
//       return { modelName, text: result.response.text().trim() };
//     } catch (error) {
//       lastError = error;
//       console.error(`[Gemini] fallo modelo ${modelName}:`, error.message);
//     }
//   }

//   throw lastError || new Error('No se pudo generar contenido con Gemini');
// }

// if (!hasGeminiKey) {
//   console.warn('GEMINI_API_KEY no definida. Usando respuestas mock para desarrollo local.');
// }

// app.post('/api/analyze-symptoms', async (req, res) => {
//   try {
//     const { symptoms } = req.body;
//     if (!genAI) {
//       const lower = String(symptoms || '').toLowerCase();
//       const sintomas_detectados = [];
//       if (lower.includes('fiebre')) sintomas_detectados.push('fiebre');
//       if (lower.includes('garganta')) sintomas_detectados.push('dolor de garganta');
//       if (lower.includes('debil')) sintomas_detectados.push('debilidad');

//       const especialidad_sugerida = 'Medicina General';
//       const nivel_urgencia = lower.includes('dificultad para respirar') ? 'Alto' : lower.includes('fiebre') ? 'Medio' : 'Bajo';
//       const resumen = sintomas_detectados.length
//         ? `Se detectaron ${sintomas_detectados.join(', ')}.`
//         : 'Síntomas recibidos.';

//       return res.json({ sintomas_detectados, especialidad_sugerida, nivel_urgencia, resumen });
//     }

//     try {
//       const { modelName, text } = await tryGeminiModels('Analiza: ' + symptoms + '. JSON: sintomas_detectados, especialidad_sugerida, nivel_urgencia, resumen');
//       console.log(`[Gemini] analyze-symptoms OK con ${modelName}`);
//       if (text.startsWith('```json')) text = text.slice(7, -3).trim();
//       else if (text.startsWith('```')) text = text.slice(3, -3).trim();
//       const parsed = JSON.parse(text);
//       return res.json(parsed);
//     } catch (geminiError) {
//       console.error('Gemini fallo en analyze-symptoms, usando fallback local:', geminiError.message);
//       const lower = String(symptoms || '').toLowerCase();
//       const sintomas_detectados = [];
//       if (lower.includes('fiebre')) sintomas_detectados.push('fiebre');
//       if (lower.includes('garganta')) sintomas_detectados.push('dolor de garganta');
//       if (lower.includes('debil')) sintomas_detectados.push('debilidad');

//       const especialidad_sugerida = 'Medicina General';
//       const nivel_urgencia = lower.includes('dificultad para respirar') ? 'Alto' : lower.includes('fiebre') ? 'Medio' : 'Bajo';
//       const resumen = sintomas_detectados.length ? `Se detectaron ${sintomas_detectados.join(', ')}.` : 'Síntomas recibidos.';
//       return res.json({ sintomas_detectados, especialidad_sugerida, nivel_urgencia, resumen, source: 'fallback-local' });
//     }
//   } catch (error) { 
//     console.error('Error /api/analyze-symptoms:', error);
//     return res.status(500).json({ error: 'Error', details: error.message }); 
//   }
// });

// app.post('/api/generate-final-response', async (req, res) => {
//   try {
//     const { specialty, hospitalName, planName, copay, urgency } = req.body;
//     if (!genAI) {
//       return res.json({
//         response: `Recomendamos acudir a ${hospitalName} para ${specialty}. Tu plan es ${planName} y el copago estimado es $${copay}. Nivel de urgencia: ${urgency}. Recuerda que es un valor aproximado.`
//       });
//     }

//     try {
//       const { modelName, text } = await tryGeminiModels('MediCopago AI. Especialidad: ' + specialty + ', Hospital: ' + hospitalName + ', Plan: ' + planName + ', Copago: ' + copay + ', Urgencia: ' + urgency + '. Responde claro, sin inventar datos.');
//       console.log(`[Gemini] generate-final-response OK con ${modelName}`);
//       return res.json({ response: text, source: 'gemini' });
//     } catch (geminiError) {
//       console.error('Gemini fallo en generate-final-response, usando fallback local:', geminiError.message);
//       return res.json({
//         response: `Recomendamos acudir a ${hospitalName} para ${specialty}. Tu plan es ${planName} y el copago estimado es $${copay}. Nivel de urgencia: ${urgency}. Recuerda que es un valor aproximado.`,
//         source: 'fallback-local'
//       });
//     }
//   } catch (error) { 
//     console.error('Error /api/generate-final-response:', error);
//     return res.status(500).json({ error: 'Error', details: error.message }); 
//   }
// });

// app.listen(PORT, () => console.log('Servidor puerto ' + PORT));


import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 3001);
const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);

const ai = hasGeminiKey
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const callWithTimeout = (promise, ms = 7000) =>
  Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
  ]);

function cleanJsonText(text) {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

function fallbackAnalyzeSymptoms(symptoms) {
  const lower = String(symptoms || "").toLowerCase();
  const sintomas_detectados = [];

  if (lower.includes("fiebre")) sintomas_detectados.push("fiebre");
  if (lower.includes("garganta")) sintomas_detectados.push("dolor de garganta");
  if (lower.includes("debil")) sintomas_detectados.push("debilidad");
  if (lower.includes("pecho")) sintomas_detectados.push("dolor de pecho");
  if (lower.includes("respirar")) sintomas_detectados.push("dificultad para respirar");

  let especialidad_sugerida = "Medicina General";
  let nivel_urgencia = "bajo";

  if (lower.includes("pecho") || lower.includes("respirar")) {
    especialidad_sugerida = "Cardiología";
    nivel_urgencia = "alto";
  } else if (lower.includes("fiebre") || lower.includes("garganta")) {
    especialidad_sugerida = "Medicina General";
    nivel_urgencia = "medio";
  }

  return {
    sintomas_detectados:
      sintomas_detectados.length > 0 ? sintomas_detectados : ["síntomas ingresados"],
    especialidad_sugerida,
    nivel_urgencia,
    resumen: "Análisis generado como respaldo local.",
    source: "fallback-local"
  };
}
app.get("/", (req, res) => {
  res.send("Backend MediCopago AI funcionando");
});



app.post("/api/analyze-symptoms", async (req, res) => {
  try {
    const { symptoms } = req.body;

    console.log("===== DEBUG ANALYZE SYMPTOMS =====");
console.log("Body recibido:", req.body);
console.log("Síntomas recibidos:", symptoms);
console.log("¿Hay API Key?:", Boolean(process.env.GEMINI_API_KEY));
console.log("Modelo usado:", process.env.GEMINI_MODEL || "gemini-2.5-flash");

    if (!symptoms || symptoms.trim() === "") {
      return res.status(400).json({
        error: "Debe ingresar síntomas."
      });
    }

    if (!ai) {
      return res.json(fallbackAnalyzeSymptoms(symptoms));
    }

    const prompt = `
Eres un agente de orientación médica y seguros.

Analiza los síntomas del paciente y devuelve únicamente un JSON válido.
No des diagnóstico médico definitivo.

Especialidades permitidas:
- Medicina General
- Cardiología
- Dermatología
- Traumatología
- Gastroenterología
- Neurología

Síntomas:
"${symptoms}"

Devuelve solo este JSON:
{
  "sintomas_detectados": [],
  "especialidad_sugerida": "",
  "nivel_urgencia": "bajo | medio | alto",
  "resumen": ""
}
`;

    const response = await callWithTimeout(
      ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: prompt
      }),
      7000
    );

    const cleanText = cleanJsonText(response.text);
    console.log("Respuesta cruda de Gemini:");
console.log(response.text);

console.log("Respuesta limpia:");
console.log(cleanText);
    const parsed = JSON.parse(cleanText);

    return res.json({
      ...parsed,
      source: "gemini"
    });
  } catch (error) {
    console.error("Error /api/analyze-symptoms completo:", error);
console.error("Mensaje:", error.message);
    return res.json(fallbackAnalyzeSymptoms(req.body.symptoms));
  }
});
app.post("/api/generate-final-response", async (req, res) => {
  try {
    const { patient, analysis, coverage } = req.body;

    if (!patient || !analysis || !coverage) {
      return res.status(400).json({
        error: "Faltan datos para generar la respuesta final."
      });
    }

    const hospitalName = coverage.bestHospital?.name || coverage.hospital?.name || "No disponible";
    const consultationCost = coverage.consultationCost || coverage.hospital?.consultationCost || "No disponible";
    const coveragePercentage = coverage.coveragePercentage || coverage.plan?.coveragePercentage || "No disponible";
    const copay = coverage.copay ?? coverage.copago ?? "No disponible";

    const fallbackMessage = `Hola ${patient.name}. Según los síntomas ingresados, te recomendamos acudir a ${analysis.especialidad_sugerida}. El hospital más conveniente dentro de tu red es ${hospitalName}. Tu plan es ${patient.plan}, tiene una cobertura del ${coveragePercentage}% y tu copago aproximado sería de $${copay}. Este valor es aproximado y no reemplaza una valoración médica.`;

    if (!ai) {
      return res.json({
        message: fallbackMessage,
        source: "fallback-local"
      });
    }

    const prompt = `
Eres un agente conversacional de seguros médicos.

Redacta una respuesta clara, breve y amable para el paciente.
No inventes datos.
No des diagnóstico médico definitivo.
Usa únicamente la información recibida.

Datos:
Paciente: ${patient.name}
Plan: ${patient.plan}
Especialidad sugerida: ${analysis.especialidad_sugerida}
Síntomas detectados: ${analysis.sintomas_detectados.join(", ")}
Urgencia: ${analysis.nivel_urgencia}
Hospital recomendado: ${hospitalName}
Costo consulta: ${consultationCost}
Cobertura: ${coveragePercentage}%
Copago estimado: ${copay}
`;

    const response = await callWithTimeout(
      ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: prompt
      }),
      7000
    );

    return res.json({
      message: response.text,
      source: "gemini"
    });
  } catch (error) {
    console.error("Error /api/generate-final-response:", error.message);

    return res.json({
  message: fallbackMessage,
  source: "fallback-after-gemini-error",
  details: error.message
});
  }
});
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});