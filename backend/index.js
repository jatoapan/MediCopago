import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// No usamos groq-sdk para evitar bugs de NPM, usamos fetch nativo
import { fileURLToPath } from 'url';
import path from 'path';
import {
  getPatientByCedula,
  createPatient,
  getHospitals,
  getPlans,
  saveHistory,
} from './notion.js';
import { buildEstimate } from './estimator.js';

// Cargar .env desde la carpeta del backend (independiente del cwd)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

const PORT = Number(process.env.PORT || 3001);
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const withTimeout = (promise, ms = 30000) =>
  Promise.race([
    promise,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error('Timeout al contactar Gemini')), ms)
    ),
  ]);

// ---------------------------------------------------------------------------
// System prompt para Gemini (solo narrativa — los datos ya vienen calculados)
// ---------------------------------------------------------------------------
function buildSystemPrompt(patient, hospitals, estimate) {
  const patientSection = patient?.id
    ? `PACIENTE: ${patient.nombre} | Cédula: ${patient.cedula} | Ciudad: ${patient.ciudad ?? 'N/D'} | Plan: ${patient.plan?.nombre ?? 'Sin plan'} | Cobertura: ${patient.plan?.coberturaPct ?? 0}% | Copago fijo: $${patient.plan?.copagoFijo ?? 0}`
    : 'PACIENTE: No identificado.';

  const estimateSection = estimate
    ? `RESULTADO YA CALCULADO (usa estos datos exactos):
- Especialidad: ${estimate.specialty}
- Urgente: ${estimate.isUrgent ? 'SÍ' : 'No'}
- Hospital recomendado: ${estimate.recommendedHospital?.nombre ?? 'No disponible'}
- Dirección: ${estimate.recommendedHospital?.direccion ?? 'N/D'}
- Costo consulta: $${estimate.recommendedHospital?.costoConsulta ?? 0}
- Copago del paciente: $${estimate.recommendedHospital?.copago ?? 0}
- Plan cubre la especialidad: ${estimate.planCoversSpecialty ? 'Sí' : 'No (sugerida Medicina General)'}
`
    : '';

  const hospitalsSection = hospitals
    .slice(0, 8)
    .map((h) => `- ${h.nombre} | ${h.ciudad} | ${h.especialidades.join(', ')} | $${h.costoConsulta}`)
    .join('\n');

  const copagoFormula = patient?.plan
    ? patient.plan.copagoFijo > 0
      ? `COPAGO = $${patient.plan.copagoFijo} fijo (sin importar el costo del hospital)`
      : `COPAGO = costoConsulta × ${100 - patient.plan.coberturaPct}% (ejemplo: $40 × ${(100 - patient.plan.coberturaPct) / 100} = $${(40 * (100 - patient.plan.coberturaPct) / 100).toFixed(2)})`
    : 'COPAGO = costo total (sin plan de seguro)';

  return `Eres MediCopago, un asistente conversacional de seguros médicos en Ecuador.
Tu misión: ayudar al paciente de forma clara, breve y empática.

${patientSection}

FÓRMULA DE COPAGO (aplica esta fórmula a CADA hospital que menciones):
${copagoFormula}

${estimateSection}
HOSPITALES EN RED (con costo de consulta para calcular copago):
${hospitalsSection}

INSTRUCCIONES:
1. Si hay urgencia, indica IR A EMERGENCIAS INMEDIATAMENTE como primera línea.
2. Conversa naturalmente: si el paciente saluda o hace preguntas generales, responde de forma amigable y pregunta sus síntomas.
3. Cuando el paciente describa síntomas, presenta la especialidad, hospital y copago usando los datos ya calculados.
4. Si el plan no cubre la especialidad, explícalo brevemente y sugiere Medicina General.
5. Cuando el paciente pregunte por otros hospitales, CALCULA el copago de cada uno usando la FÓRMULA DE COPAGO con el costo de ese hospital específico.
6. No inventes hospitales, costos ni coberturas.
7. Si el paciente pregunta algo completamente ajeno a salud o seguros médicos (vuelos, recetas de cocina, etc.), responde brevemente que solo puedes ayudar con temas médicos.
8. NO ofrezcas agendar ni reservar citas médicas. Eres solo un estimador financiero. Si el usuario acepta ir, dile que se acerque al hospital o contacte a su red.
9. Responde siempre en español, de forma breve y empática sin extenderte.`;
}

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------

function formatNetworkError(err, defaultMsg) {
  const detail = err?.message || JSON.stringify(err);
  if (detail.includes('ENOTFOUND') || detail.includes('ECONNRESET') || detail.includes('ETIMEDOUT') || detail.includes('fetch')) {
    return 'Fallo de red: No se pudo conectar con los servidores. Revisa tu conexión a internet.';
  }
  return err?.body ? JSON.stringify(err.body) : (defaultMsg || detail);
}

app.get('/', (_req, res) => {
  res.json({ status: 'MediCopago AI backend funcionando' });
});

// Identificar paciente por cédula
app.post('/api/identify-patient', async (req, res) => {
  try {
    const { cedula } = req.body;
    if (!cedula?.trim()) return res.status(400).json({ error: 'La cédula es requerida' });

    const patient = await getPatientByCedula(cedula);
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });

    return res.json(patient);
  } catch (err) {
    console.error('[/api/identify-patient]', err.message);
    return res.status(503).json({ error: formatNetworkError(err, 'Error interno al buscar el paciente') });
  }
});

// Registrar paciente nuevo
app.post('/api/register-patient', async (req, res) => {
  try {
    const { nombre, cedula, fechaNacimiento, ciudad, planId } = req.body;

    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
    if (!cedula?.trim()) return res.status(400).json({ error: 'La cédula es requerida' });

    // Verificar si ya existe
    const existing = await getPatientByCedula(cedula);
    if (existing) return res.status(409).json({ error: 'Ya existe un paciente con esa cédula' });

    const patient = await createPatient({ nombre, cedula, fechaNacimiento, ciudad, planId });
    return res.status(201).json(patient);
  } catch (err) {
    const detail = formatNetworkError(err, 'Error al registrar el paciente');
    console.error('[/api/register-patient]', err.message);
    // Devolver el mensaje real para poder diagnosticar desde el frontend
    return res.status(503).json({ error: detail });
  }
});

// Listar planes disponibles (para el formulario de registro)
app.get('/api/plans', async (_req, res) => {
  try {
    const plans = await getPlans();
    return res.json(plans);
  } catch (err) {
    const detail = err?.body ? JSON.stringify(err.body) : err.message;
    console.error('[/api/plans]', detail);
    return res.json([]); // devolver array vacío en vez de error para no romper la UI
  }
});

// Estimación determinista
app.post('/api/estimate', async (req, res) => {
  try {
    const { symptomText, patient = null, modoAcceso = 'cedula' } = req.body;
    if (!symptomText?.trim()) return res.status(400).json({ error: 'El síntoma es requerido' });

    const hospitals = await getHospitals();
    const estimate = buildEstimate({ symptomText, patient, hospitals });

    // Guardar en historial solo si hay síntoma real (no saludos ni texto corto)
    if (estimate.recommendedHospital && estimate.hasSymptom) {
      saveHistory({
        sintoma: symptomText,
        pacienteId: patient?.id ?? null,
        especialidad: estimate.specialty,
        hospitalRecomendado: estimate.recommendedHospital.nombre,
        copagoEstimado: estimate.recommendedHospital.copago,
        esUrgente: estimate.isUrgent,
        modoAcceso,
      }).catch((e) => console.error('[saveHistory]', e.message));
    }

    return res.json(estimate);
  } catch (err) {
    console.error('[/api/estimate]', err.message);
    return res.status(503).json({ error: formatNetworkError(err, 'Error al calcular la estimación') });
  }
});

// Chat con Gemini (narrativa)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], patient = null, estimate = null } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'El mensaje no puede estar vacío' });

    const hospitals = await getHospitals();
    const systemPrompt = buildSystemPrompt(patient, hospitals, estimate);

    if (!process.env.GROQ_API_KEY) {
      return res.json({
        reply: `Hola${patient?.nombre ? ` ${patient.nombre}` : ''}. El servicio de análisis no está disponible. Por favor contacta a tu aseguradora.`,
        source: 'fallback-no-key',
      });
    }

    const contents = [
      { role: 'system', content: systemPrompt },
      ...history.map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    const groqResponse = await withTimeout(
      fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: contents,
        })
      }),
      30000
    );

    if (!groqResponse.ok) {
      const errorData = await groqResponse.text();
      throw new Error(`Groq API Error: ${errorData}`);
    }

    const responseData = await groqResponse.json();
    return res.json({ reply: responseData.choices[0].message.content, source: 'groq' });
  } catch (err) {
    const errorDetail = err?.message || JSON.stringify(err);
    console.error('[/api/chat]', errorDetail);

    // Recuperamos estimate del req.body ya que la variable original está dentro del bloque try
    const fallbackEstimate = req.body?.estimate;

    // Fallback determinista: Si Gemini falla pero tenemos una estimación válida, respondemos automáticamente.
    if (fallbackEstimate && fallbackEstimate.hasSymptom) {
      const hospitalStr = fallbackEstimate.recommendedHospital 
        ? `Puedes acudir a **${fallbackEstimate.recommendedHospital.nombre}**. Tu copago estimado será de **$${fallbackEstimate.recommendedHospital.copago.toFixed(2)}**.`
        : 'Revisa las opciones de la red en la tarjeta adjunta.';
      
      let replyText = `*(Modo de contingencia por alta demanda en IA)*\n\nSegún los síntomas que mencionas, te sugiero la especialidad de **${fallbackEstimate.specialty}**. ${hospitalStr}`;
      
      if (fallbackEstimate.isUrgent) {
        replyText = `🚨 **URGENCIA MÉDICA**: Por favor acude a la sala de emergencias más cercana inmediatamente.\n\n` + replyText;
      }
      
      return res.json({ reply: replyText, source: 'fallback-deterministic' });
    }

    // Si no hay estimación (ej. solo dijo "hola"), mostramos el error original
    if (errorDetail.includes('429') || errorDetail.includes('RESOURCE_EXHAUSTED') || errorDetail.includes('quota') || errorDetail.toLowerCase().includes('rate limit')) {
      return res.status(429).json({ error: 'Se ha agotado el límite por minuto de la IA. Espera unos segundos y vuelve a intentar.' });
    }
    
    if (errorDetail.includes('503') || errorDetail.includes('UNAVAILABLE') || errorDetail.includes('high demand')) {
      return res.status(503).json({ error: 'La IA está saturada. Por favor, envía tu síntoma nuevamente.' });
    }

    return res.status(500).json({ error: 'Error al procesar el mensaje. Intenta de nuevo.' });
  }
});

app.listen(PORT, () => {
  console.log(`MediCopago backend corriendo en http://localhost:${PORT}`);
});
