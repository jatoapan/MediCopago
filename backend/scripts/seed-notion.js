/**
 * Seed script para Notion — MediCopago AI
 * Crea hospitales, planes y pacientes de prueba en las BDs de Notion.
 *
 * Uso: node scripts/seed-notion.js
 *
 * Requiere en .env:
 *   NOTION_TOKEN, NOTION_HOSPITALS_DB, NOTION_PLANS_DB,
 *   NOTION_PATIENTS_DB, NOTION_HISTORY_DB
 */

import { Client } from '@notionhq/client';
import { config } from 'dotenv';

config();

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// ---------------------------------------------------------------------------
// Datos de prueba
// ---------------------------------------------------------------------------

const HOSPITALS = [
  // Guayaquil
  {
    nombre: 'Hospital Central Guayaquil',
    especialidades: ['Medicina General', 'Cardiologia', 'Neurologia'],
    costoConsulta: 50,
    enRed: true,
    direccion: 'Av. 9 de Octubre 123, Centro',
    ciudad: 'Guayaquil',
  },
  {
    nombre: 'Clinica Kennedy Norte',
    especialidades: ['Medicina General', 'Pediatria', 'Dermatologia'],
    costoConsulta: 90,
    enRed: true,
    direccion: 'Av. Francisco de Orellana, Kennedy Norte',
    ciudad: 'Guayaquil',
  },
  {
    nombre: 'Hospital Luis Vernaza',
    especialidades: ['Medicina General', 'Traumatologia', 'Gastroenterologia'],
    costoConsulta: 70,
    enRed: true,
    direccion: 'Av. Quito y Gomez Rendon',
    ciudad: 'Guayaquil',
  },
  {
    nombre: 'Centro Medico Sur Guayaquil',
    especialidades: ['Medicina General', 'Traumatologia', 'Gastroenterologia'],
    costoConsulta: 40,
    enRed: true,
    direccion: 'Av. del Ejercito 789, Sur',
    ciudad: 'Guayaquil',
  },
  // Quito
  {
    nombre: 'Hospital Metropolitano Quito',
    especialidades: ['Medicina General', 'Cardiologia', 'Neurologia'],
    costoConsulta: 110,
    enRed: true,
    direccion: 'Av. Mariana de Jesus s/n',
    ciudad: 'Quito',
  },
  {
    nombre: 'Hospital del IESS Quito Sur',
    especialidades: ['Medicina General', 'Cardiologia', 'Neurologia'],
    costoConsulta: 30,
    enRed: true,
    direccion: 'Av. 10 de Agosto y Nunez de Vela',
    ciudad: 'Quito',
  },
  {
    nombre: 'Clinica Pichincha',
    especialidades: ['Medicina General', 'Pediatria', 'Dermatologia', 'Gastroenterologia'],
    costoConsulta: 80,
    enRed: true,
    direccion: 'Veintimilla E3-37 y Paez',
    ciudad: 'Quito',
  },
  {
    nombre: 'Hospital Vozandes Quito',
    especialidades: ['Medicina General', 'Traumatologia', 'Cardiologia'],
    costoConsulta: 95,
    enRed: true,
    direccion: 'Villalengua 267 y Av. 10 de Agosto',
    ciudad: 'Quito',
  },
  // Cuenca
  {
    nombre: 'Centro Clinico Cuenca',
    especialidades: ['Medicina General', 'Pediatria', 'Dermatologia'],
    costoConsulta: 55,
    enRed: true,
    direccion: 'Av. Solano y 12 de Abril',
    ciudad: 'Cuenca',
  },
  {
    nombre: 'Clinica Santa Ines Cuenca',
    especialidades: ['Medicina General', 'Cardiologia', 'Neurologia', 'Traumatologia'],
    costoConsulta: 75,
    enRed: true,
    direccion: 'Av. Daniel Alarcon 2-60',
    ciudad: 'Cuenca',
  },
  // Ambato
  {
    nombre: 'Clinica Los Andes Ambato',
    especialidades: ['Medicina General', 'Traumatologia'],
    costoConsulta: 45,
    enRed: true,
    direccion: 'Av. Cevallos y Lalama',
    ciudad: 'Ambato',
  },
  // Manta
  {
    nombre: 'Centro Medico Manta',
    especialidades: ['Medicina General', 'Gastroenterologia'],
    costoConsulta: 50,
    enRed: true,
    direccion: 'Av. 4 de Noviembre y Calle 13',
    ciudad: 'Manta',
  },
  // Loja
  {
    nombre: 'Clinica Santa Maria Loja',
    especialidades: ['Medicina General', 'Dermatologia'],
    costoConsulta: 60,
    enRed: true,
    direccion: 'Av. Universitaria y Pio Jaramillo',
    ciudad: 'Loja',
  },
  // Machala
  {
    nombre: 'Hospital Teofilo Davila Machala',
    especialidades: ['Medicina General', 'Traumatologia'],
    costoConsulta: 40,
    enRed: true,
    direccion: 'Av. Panamericana y Boyaca',
    ciudad: 'Machala',
  },
];

const PLANS = [
  {
    nombre: 'Plan Basico Salud',
    coberturaPct: 80,
    copagoFijo: 0,
    especialidadesCubiertas: ['Medicina General', 'Pediatria'],
  },
  {
    nombre: 'Plan Premium',
    coberturaPct: 90,
    copagoFijo: 5,
    especialidadesCubiertas: [
      'Medicina General',
      'Cardiologia',
      'Neurologia',
      'Dermatologia',
      'Traumatologia',
      'Gastroenterologia',
      'Pediatria',
    ],
  },
  {
    nombre: 'Plan Familiar',
    coberturaPct: 85,
    copagoFijo: 0,
    especialidadesCubiertas: ['Medicina General', 'Pediatria', 'Traumatologia'],
  },
  {
    nombre: 'Plan Empresarial',
    coberturaPct: 88,
    copagoFijo: 10,
    especialidadesCubiertas: [
      'Medicina General',
      'Cardiologia',
      'Traumatologia',
      'Gastroenterologia',
    ],
  },
  {
    nombre: 'Plan Senior',
    coberturaPct: 92,
    copagoFijo: 15,
    especialidadesCubiertas: [
      'Medicina General',
      'Cardiologia',
      'Neurologia',
      'Gastroenterologia',
    ],
  },
];

const planIds = {};

// Cédulas ecuatorianas únicas y válidas (módulo 10, provincia correcta por ciudad)
// Verificación: prov(2d) 01-24 | d[2]<6 | coef[2,1,2,1,2,1,2,1,2] | sum%10→verifier
const PATIENTS = [
  // Guayaquil → provincia 09
  { nombre: 'Juan Perez',      cedula: '0901234567', planNombre: 'Plan Basico Salud',  fechaNacimiento: '1990-05-15', ciudad: 'Guayaquil' },
  { nombre: 'Ana Torres',      cedula: '0911234565', planNombre: 'Plan Familiar',       fechaNacimiento: '1988-02-11', ciudad: 'Guayaquil' },
  { nombre: 'Diego Andrade',   cedula: '0921234563', planNombre: 'Plan Basico Salud',   fechaNacimiento: '1992-12-05', ciudad: 'Guayaquil' },
  { nombre: 'Paula Rojas',     cedula: '0931234561', planNombre: 'Plan Familiar',       fechaNacimiento: '1991-04-19', ciudad: 'Guayaquil' },
  { nombre: 'Andres Castillo', cedula: '0941234569', planNombre: 'Plan Empresarial',    fechaNacimiento: '1986-06-14', ciudad: 'Guayaquil' },
  { nombre: 'Miguel Herrera',  cedula: '0951234566', planNombre: 'Plan Senior',         fechaNacimiento: '1970-11-21', ciudad: 'Guayaquil' },
  { nombre: 'Ricardo Flores',  cedula: '0919876540', planNombre: 'Plan Premium',        fechaNacimiento: '1984-05-09', ciudad: 'Guayaquil' },
  // Quito → provincia 17
  { nombre: 'Maria Gomez',     cedula: '1711234565', planNombre: 'Plan Premium',        fechaNacimiento: '1995-03-22', ciudad: 'Quito'     },
  { nombre: 'Sofia Paredes',   cedula: '1721234563', planNombre: 'Plan Premium',        fechaNacimiento: '1998-07-27', ciudad: 'Quito'     },
  { nombre: 'Jorge Molina',    cedula: '1731234561', planNombre: 'Plan Senior',         fechaNacimiento: '1965-01-30', ciudad: 'Quito'     },
  { nombre: 'Daniela Ortiz',   cedula: '1741234569', planNombre: 'Plan Familiar',       fechaNacimiento: '1996-08-16', ciudad: 'Quito'     },
  // Cuenca → provincia 01 (Azuay)
  { nombre: 'Carlos Lopez',    cedula: '0111234563', planNombre: 'Plan Basico Salud',   fechaNacimiento: '1978-11-08', ciudad: 'Cuenca'    },
  { nombre: 'Luis Ramirez',    cedula: '0121234561', planNombre: 'Plan Empresarial',    fechaNacimiento: '1982-09-03', ciudad: 'Cuenca'    },
  { nombre: 'Karla Velez',     cedula: '0131234569', planNombre: 'Plan Premium',        fechaNacimiento: '1993-10-10', ciudad: 'Cuenca'    },
  // Ambato → provincia 18 (Tungurahua)
  { nombre: 'Valeria Cruz',    cedula: '1811234564', planNombre: 'Plan Basico Salud',   fechaNacimiento: '2000-03-08', ciudad: 'Ambato'    },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg) { console.log(`[seed] ${msg}`); }

function bail(msg) {
  console.error(`[seed] ERROR: ${msg}`);
  process.exit(1);
}

function checkEnv() {
  const required = [
    'NOTION_TOKEN',
    'NOTION_HOSPITALS_DB',
    'NOTION_PLANS_DB',
    'NOTION_PATIENTS_DB',
    'NOTION_HISTORY_DB',
  ];
  for (const key of required) {
    if (!process.env[key]) bail(`Falta la variable de entorno: ${key}`);
  }
}

// ---------------------------------------------------------------------------
// Creadores
// ---------------------------------------------------------------------------

async function createHospital(h) {
  await notion.pages.create({
    parent: { database_id: process.env.NOTION_HOSPITALS_DB },
    properties: {
      Nombre: { title: [{ text: { content: h.nombre } }] },
      Especialidades: { multi_select: h.especialidades.map((name) => ({ name })) },
      'Costo Consulta': { number: h.costoConsulta },
      'En Red': { checkbox: h.enRed },
      Direccion: { rich_text: [{ text: { content: h.direccion } }] },
      Ciudad: { select: { name: h.ciudad } },
    },
  });
  log(`Hospital creado: ${h.nombre} (${h.ciudad})`);
}

async function createPlan(p) {
  const page = await notion.pages.create({
    parent: { database_id: process.env.NOTION_PLANS_DB },
    properties: {
      Nombre: { title: [{ text: { content: p.nombre } }] },
      'Cobertura (%)': { number: p.coberturaPct },
      'Copago Fijo': { number: p.copagoFijo },
      'Especialidades Cubiertas': {
        multi_select: p.especialidadesCubiertas.map((name) => ({ name })),
      },
    },
  });
  planIds[p.nombre] = page.id;
  log(`Plan creado: ${p.nombre} → ID: ${page.id}`);
}

async function createPatient(p) {
  const planId = planIds[p.planNombre];
  if (!planId) bail(`No se encontro el ID del plan "${p.planNombre}".`);

  await notion.pages.create({
    parent: { database_id: process.env.NOTION_PATIENTS_DB },
    properties: {
      Nombre: { title: [{ text: { content: p.nombre } }] },
      Cedula: { rich_text: [{ text: { content: p.cedula } }] },
      Plan: { relation: [{ id: planId }] },
      'Fecha de Nacimiento': { date: { start: p.fechaNacimiento } },
      Ciudad: { select: { name: p.ciudad } },
    },
  });
  log(`Paciente creado: ${p.nombre} (${p.cedula}) — ${p.ciudad} — ${p.planNombre}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  checkEnv();

  log('Iniciando seed de Notion...\n');

  log('--- Creando hospitales ---');
  for (const h of HOSPITALS) await createHospital(h);

  log('\n--- Creando planes ---');
  for (const p of PLANS) await createPlan(p);

  log('\n--- Creando pacientes ---');
  for (const p of PATIENTS) await createPatient(p);

  log('\nSeed completado. Verifica los datos en Notion.');
  log('\nCedulas de prueba:');
  for (const p of PATIENTS) {
    log(`  ${p.cedula} → ${p.nombre} (${p.ciudad}) — ${p.planNombre}`);
  }
}

main().catch((err) => {
  console.error('[seed] Error inesperado:', err.message);
  process.exit(1);
});
