import { Client } from '@notionhq/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Cargar .env antes de inicializar el Client (ESM hoist fix)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const notion = new Client({ auth: process.env.NOTION_TOKEN });

function extractText(prop) {
  if (!prop) return '';
  if (prop.title?.length) return prop.title[0]?.plain_text ?? '';
  if (prop.rich_text?.length) return prop.rich_text[0]?.plain_text ?? '';
  return '';
}

// ---------------------------------------------------------------------------
// Pacientes
// ---------------------------------------------------------------------------

export async function getPatientByCedula(cedula) {
  const res = await notion.databases.query({
    database_id: process.env.NOTION_PATIENTS_DB,
    filter: { property: 'Cedula', rich_text: { equals: cedula.trim() } },
  });

  if (!res.results.length) return null;

  const page = res.results[0];
  const props = page.properties;

  let plan = null;
  const planRelation = props['Plan']?.relation;
  if (planRelation?.length > 0) {
    plan = await getPlanById(planRelation[0].id);
  }

  return {
    id: page.id,
    nombre: extractText(props['Nombre']),
    cedula: extractText(props['Cedula']),
    fechaNacimiento: props['Fecha de Nacimiento']?.date?.start ?? null,
    ciudad: props['Ciudad']?.select?.name ?? null,
    plan,
  };
}

export async function createPatient({ nombre, cedula, fechaNacimiento, ciudad, planId }) {
  const properties = {
    Nombre: { title: [{ text: { content: nombre } }] },
    Cedula: { rich_text: [{ text: { content: cedula } }] },
  };
  if (fechaNacimiento) {
    properties['Fecha de Nacimiento'] = { date: { start: fechaNacimiento } };
  }
  if (ciudad) {
    properties['Ciudad'] = { select: { name: ciudad } };
  }
  if (planId) {
    properties['Plan'] = { relation: [{ id: planId }] };
  }

  let page;
  try {
    page = await notion.pages.create({
      parent: { database_id: process.env.NOTION_PATIENTS_DB },
      properties,
    });
  } catch (err) {
    // Si falló y había Ciudad, reintentar sin ella (columna puede no existir aún)
    if (ciudad && (err?.message?.includes('Ciudad') || err?.body)) {
      console.warn('[createPatient] Reintentando sin Ciudad:', err.message);
      delete properties['Ciudad'];
      page = await notion.pages.create({
        parent: { database_id: process.env.NOTION_PATIENTS_DB },
        properties,
      });
    } else {
      throw err;
    }
  }

  const props = page.properties;
  let plan = null;
  if (planId) plan = await getPlanById(planId);

  return {
    id: page.id,
    nombre: extractText(props['Nombre']),
    cedula: extractText(props['Cedula']),
    fechaNacimiento: props['Fecha de Nacimiento']?.date?.start ?? null,
    ciudad: props['Ciudad']?.select?.name ?? ciudad ?? null,
    plan,
  };
}

// ---------------------------------------------------------------------------
// Planes
// ---------------------------------------------------------------------------

async function getPlanById(planId) {
  const page = await notion.pages.retrieve({ page_id: planId });
  const props = page.properties;

  return {
    id: page.id,
    nombre: extractText(props['Nombre']),
    coberturaPct: props['Cobertura (%)']?.number ?? 0,
    copagoFijo: props['Copago Fijo']?.number ?? 0,
    especialidadesCubiertas:
      props['Especialidades Cubiertas']?.multi_select?.map((e) => e.name) ?? [],
  };
}

export async function getPlans() {
  const res = await notion.databases.query({
    database_id: process.env.NOTION_PLANS_DB,
    sorts: [{ property: 'Nombre', direction: 'ascending' }],
  });

  return res.results.map((page) => {
    const props = page.properties;
    return {
      id: page.id,
      nombre: extractText(props['Nombre']),
      coberturaPct: props['Cobertura (%)']?.number ?? 0,
      copagoFijo: props['Copago Fijo']?.number ?? 0,
      especialidadesCubiertas:
        props['Especialidades Cubiertas']?.multi_select?.map((e) => e.name) ?? [],
    };
  });
}

// ---------------------------------------------------------------------------
// Hospitales
// ---------------------------------------------------------------------------

export async function getHospitals() {
  const res = await notion.databases.query({
    database_id: process.env.NOTION_HOSPITALS_DB,
    filter: { property: 'En Red', checkbox: { equals: true } },
  });

  return res.results.map((page) => {
    const props = page.properties;
    return {
      id: page.id,
      nombre: extractText(props['Nombre']),
      especialidades: props['Especialidades']?.multi_select?.map((e) => e.name) ?? [],
      costoConsulta: props['Costo Consulta']?.number ?? 0,
      direccion: extractText(props['Direccion']),
      ciudad: props['Ciudad']?.select?.name ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Historial de Consultas
// ---------------------------------------------------------------------------

export async function saveHistory({
  sintoma,
  pacienteId,
  especialidad,
  hospitalRecomendado,
  copagoEstimado,
  esUrgente,
  modoAcceso,
}) {
  const properties = {
    Sintoma: { title: [{ text: { content: sintoma.slice(0, 200) } }] },
    Especialidad: { select: { name: especialidad } },
    'Hospital Recomendado': {
      rich_text: [{ text: { content: hospitalRecomendado ?? 'No disponible' } }],
    },
    'Copago Estimado': { number: copagoEstimado ?? 0 },
    'Es Urgente': { checkbox: Boolean(esUrgente) },
    Fecha: { date: { start: new Date().toISOString().split('T')[0] } },
    'Modo Acceso': { select: { name: modoAcceso ?? 'cedula' } },
  };

  if (pacienteId) {
    properties['Paciente'] = { relation: [{ id: pacienteId }] };
  }

  await notion.pages.create({
    parent: { database_id: process.env.NOTION_HISTORY_DB },
    properties,
  });
}

export async function getPatientHistory(pacienteId) {
  const res = await notion.databases.query({
    database_id: process.env.NOTION_HISTORY_DB,
    filter: { property: 'Paciente', relation: { contains: pacienteId } },
    sorts: [{ property: 'Fecha', direction: 'descending' }],
    page_size: 5,
  });

  return res.results.map((page) => {
    const props = page.properties;
    return {
      sintoma: extractText(props['Sintoma']),
      especialidad: props['Especialidad']?.select?.name ?? '',
      hospitalRecomendado: extractText(props['Hospital Recomendado']),
      copagoEstimado: props['Copago Estimado']?.number ?? 0,
      esUrgente: props['Es Urgente']?.checkbox ?? false,
      fecha: props['Fecha']?.date?.start ?? '',
    };
  });
}
