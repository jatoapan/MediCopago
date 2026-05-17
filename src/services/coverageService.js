import { insurancePlans } from '../data/insurancePlans.js';
import { hospitals } from '../data/hospitals.js';

const normalize = (s = '') =>
  s
    .toString()
    .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .toLowerCase();

export const calculateCoverage = (patient, specialty) => {
  const plan = insurancePlans.find(p => p.id === patient.planId);
  if (!plan) return { error: 'Plan no encontrado' };

  const normSpec = normalize(specialty);
  // si no viene especialidad, asumir Medicina General
  const effectiveSpec = normSpec && normSpec.length ? normSpec : 'medicina general';

  // buscar coincidencias tolerantes (acentos / case)
  let validHospitals = hospitals.filter(h =>
    h.inNetwork &&
    h.specialties.some(spec => {
      const n = normalize(spec);
      if (n === effectiveSpec || n.includes(effectiveSpec) || effectiveSpec.includes(n)) return true;
      // token match: e.g., 'medicina general' vs 'medicina'
      const specTokens = n.split(/\s+/).filter(Boolean);
      const reqTokens = effectiveSpec.split(/\s+/).filter(Boolean);
      return specTokens.some(t => reqTokens.includes(t)) || reqTokens.some(t => specTokens.includes(t));
    })
  );

  // si no hay coincidencias por especialidad, fallback: cualquier hospital en red
  if (validHospitals.length === 0) {
    validHospitals = hospitals.filter(h => h.inNetwork);
    if (validHospitals.length === 0) return { error: 'Sin hospitales en red' };
  }

  const cheapestHospital = validHospitals.reduce((prev, curr) => (prev.consultationCost < curr.consultationCost) ? prev : curr);

  // calcular copago por porcentaje (mantener compatibilidad con comportamiento previo)
  const copago = Math.round(cheapestHospital.consultationCost * (100 - plan.coveragePercentage) / 100);

  return {
    bestHospital: cheapestHospital,
    hospital: cheapestHospital,
    plan,
    copay: copago,
    copago
  };
};