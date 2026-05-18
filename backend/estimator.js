/**
 * estimator.js — Motor determinístico de MediCopago
 * Sin IA: detecta especialidad, urgencia y calcula copago con reglas puras.
 */

// Normaliza texto: minúsculas + sin tildes
const norm = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

// ---------------------------------------------------------------------------
// Palabras clave de síntomas generales (para detectar si realmente hay un síntoma)
// ---------------------------------------------------------------------------
const GENERAL_SYMPTOMS = [
  'dolor', 'duele', 'fiebre', 'gripe', 'tos', 'resfriado', 'malestar',
  'infeccion', 'cansancio', 'fatiga', 'sintoma', 'ardor', 'escalofrio',
  'sangre', 'herida', 'golpe', 'molestia', 'inflamado', 'hinchado'
];

// ---------------------------------------------------------------------------
// Mapa keyword → especialidad (orden: más específico primero)
// ---------------------------------------------------------------------------
const SPECIALTY_KEYWORDS = {
  Cardiologia: [
    'dolor de pecho', 'pecho', 'corazon', 'taquicardia', 'arritmia',
    'presion alta', 'palpitaciones', 'angina', 'cardiaco',
  ],
  Dermatologia: [
    'roncha', 'sarpullido', 'picazon', 'erupcion', 'urticaria',
    'manchas en la piel', 'alergia en la piel', 'acne', 'piel',
  ],
  Traumatologia: [
    'fractura', 'esguince', 'torcedura', 'luxacion', 'rodilla',
    'tobillo', 'caida', 'golpe', 'hueso', 'columna',
  ],
  Gastroenterologia: [
    'abdomen', 'estomago', 'nausea', 'vomito', 'diarrea',
    'colon', 'higado', 'acidez', 'reflujo', 'digestion',
  ],
  Neurologia: [
    'migrana', 'mareo', 'convulsion', 'hormigueo', 'temblor',
    'memoria', 'perdida de vision', 'cabeza',
  ],
  Pediatria: [
    'mi hijo', 'mi hija', 'el nino', 'la nina', 'el bebe',
    'mi bebe', 'infante', 'el menor', 'nino', 'nina',
  ],
};

// ---------------------------------------------------------------------------
// Palabras/frases de urgencia
// ---------------------------------------------------------------------------
const URGENCY_PHRASES = [
  'dolor de pecho', 'dificultad para respirar', 'no puedo respirar',
  'perdida de conciencia', 'sangrado severo', 'sangrado abundante',
  'paro cardiaco', 'infarto', 'derrame cerebral', 'convulsion severa',
  'accidente cerebrovascular', 'me desmaye', 'me desmayo',
  'accidente', 'herida grave', 'corte profundo', 'fractura expuesta',
  'quemadura', 'asfixia', 'envenenamiento', 'intoxicacion',
  'desangrando', 'emergencia', 'urgencia grave'
];

// ---------------------------------------------------------------------------
// Detección
// ---------------------------------------------------------------------------
export function detectSpecialty(text) {
  const t = norm(text);
  for (const [specialty, keywords] of Object.entries(SPECIALTY_KEYWORDS)) {
    if (keywords.some((kw) => t.includes(norm(kw)))) {
      return { specialty, detected: true };
    }
  }
  const hasGenericSymptom = GENERAL_SYMPTOMS.some((kw) => t.includes(norm(kw)));
  return { specialty: 'Medicina General', detected: hasGenericSymptom };
}

export function detectUrgency(text) {
  const t = norm(text);
  return URGENCY_PHRASES.some((phrase) => t.includes(norm(phrase)));
}

// ---------------------------------------------------------------------------
// Cálculo de copago
// ---------------------------------------------------------------------------
export function calculateCopago(costoConsulta, plan) {
  if (!plan) return +costoConsulta.toFixed(2);           // sin plan: 100%
  if (plan.copagoFijo > 0) return +plan.copagoFijo.toFixed(2); // copago fijo
  return +(costoConsulta * (1 - plan.coberturaPct / 100)).toFixed(2);
}

// ---------------------------------------------------------------------------
// Estimación completa
// ---------------------------------------------------------------------------
export function buildEstimate({ symptomText, patient, hospitals }) {
  const { specialty, detected: specialtyDetected } = detectSpecialty(symptomText);
  const isUrgent = detectUrgency(symptomText);
  const hasSymptom = specialtyDetected || isUrgent;
  const plan = patient?.plan ?? null;

  // ¿El plan cubre la especialidad?
  let effectiveSpecialty = specialty;
  let planCoversSpecialty = true;
  if (plan?.especialidadesCubiertas?.length > 0) {
    if (
      specialty !== 'Medicina General' &&
      !plan.especialidadesCubiertas.includes(specialty)
    ) {
      planCoversSpecialty = false;
      effectiveSpecialty = 'Medicina General';
    }
  }

  // Filtrar hospitales por especialidad
  let candidates = hospitals.filter((h) =>
    h.especialidades.includes(effectiveSpecialty)
  );

  // Preferir misma ciudad del paciente
  const patientCity = patient?.ciudad ?? null;
  if (patientCity) {
    const sameCity = candidates.filter((h) => h.ciudad === patientCity);
    if (sameCity.length > 0) candidates = sameCity;
  }

  // Calcular copago por hospital y ordenar por más económico
  const withCopago = candidates
    .map((h) => ({ ...h, copago: calculateCopago(h.costoConsulta, plan) }))
    .sort((a, b) => a.copago - b.copago);

  const best = withCopago[0] ?? null;

  return {
    hasSymptom,
    specialty: effectiveSpecialty,
    originalSpecialty: specialty,
    planCoversSpecialty,
    isUrgent,
    recommendedHospital: best
      ? {
          nombre: best.nombre,
          direccion: best.direccion,
          ciudad: best.ciudad,
          costoConsulta: best.costoConsulta,
          copago: best.copago,
        }
      : null,
    allOptions: withCopago.slice(0, 3).map((h) => ({
      nombre: h.nombre,
      ciudad: h.ciudad,
      costoConsulta: h.costoConsulta,
      copago: h.copago,
    })),
    plan: plan
      ? { nombre: plan.nombre, coberturaPct: plan.coberturaPct, copagoFijo: plan.copagoFijo }
      : null,
  };
}
