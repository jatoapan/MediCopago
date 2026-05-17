# MediCopago AI

MediCopago AI es una demo para hackathon que ayuda a pacientes a estimar su copago médico antes de acudir a consulta. La app analiza síntomas con Gemini, identifica una especialidad probable, busca un hospital dentro de la red según el seguro del paciente y calcula el copago estimado usando datos simulados.

## Flujo Actual
1. El usuario selecciona un perfil de paciente.
2. Escribe sus síntomas.
3. El backend usa Gemini para devolver un análisis con síntomas detectados, especialidad sugerida, nivel de urgencia y resumen.
4. El sistema cruza esa información con planes, pacientes y hospitales simulados.
5. Se muestra hospital recomendado, plan, cobertura y copago estimado.
6. Se genera una respuesta final breve y orientativa para el paciente.

## Tecnologías
- React
- Vite
- JavaScript
- Node.js
- Express
- Google Gemini API
- pnpm

## Requisitos
- Node.js 18 o superior
- pnpm instalado
- Una API key válida de Gemini

## Configuración
Crear un archivo `.env` en la raíz del proyecto con estas variables:

```env
GEMINI_API_KEY=tu_clave_aqui
GEMINI_MODEL=gemini-2.5-flash
```

`GEMINI_MODEL` permite cambiar el modelo sin tocar el código. Si no se define, el backend usa `gemini-2.5-flash` por defecto.

## Instalación y Ejecución

Instalar dependencias:

```bash
pnpm install
```

Levantar frontend y backend al mismo tiempo:

```bash
pnpm dev
```

Si quieres correrlos por separado:

```bash
pnpm server
pnpm client
```

## Datos Simulados
La app usa archivos locales en `src/data` para evitar depender de una base de datos real:

- `patients.js`: perfiles de pacientes
- `insurancePlans.js`: planes y cobertura
- `hospitals.js`: red de hospitales y costos

## Aviso Importante
Esta aplicación es solo una demo. No reemplaza una evaluación médica real ni entrega diagnósticos definitivos. Si la urgencia es alta, se debe buscar atención médica pronto.

## Notas Técnicas
- El backend tiene fallback local para no bloquear la demo si Gemini falla o excede cuota.
- La información de hospital y copago se calcula en el código, no por la IA.
