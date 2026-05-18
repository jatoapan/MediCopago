# MediCopago AI: Estimador Agéntico de Copago y Cobertura 🏥🤖

Un agente conversacional inteligente diseñado para ayudar al paciente a entender sus beneficios médicos *antes* de atenderse. El paciente ingresa su síntoma, el agente sugiere la especialidad requerida y el hospital ideal. Cruzando estos datos con su plan de seguro en tiempo real, le indica exactamente **cuánto será su copago** y qué opción de la red le conviene más económicamente.

🚀 **¡Pruébalo ahora!**
* **Enlace público del agente funcional:** https://medicopago.vercel.app/
* **Enlace del repositorio en GitHub o GitLab:** https://github.com/jatoapan/MediCopago
* **Base de datos en Notion:** https://www.notion.so/BD-36416e3153af80329715d170ce003b49?source=copy_link

---

## ✨ Qué hace

1. **Consulta la base de datos de pacientes y planes** en Notion para identificar al usuario por su cédula y conocer su porcentaje de cobertura o copago fijo.
2. **Motor Determinista de Síntomas:** Identifica palabras clave en la dolencia del paciente para derivarlo a la especialidad correcta (Ej: "me duele el pecho" -> Cardiología).
3. **Cálculo Financiero en Tiempo Real:** Cruza el costo de consulta del hospital recomendado con el plan del paciente para calcular el copago exacto.
4. **Agente Conversacional Llama 3:** Envía el contexto estructurado a la IA para que le comunique los resultados al paciente de forma empática y natural, manteniendo el hilo de la conversación.
5. **Registro de Historial:** Guarda cada consulta médica evaluada en una base de datos histórica en Notion para auditoría y seguimiento.
6. **Manejo de Contingencias:** Si la IA falla o se satura, el sistema entra en un modo de contingencia determinista para garantizar que el paciente siempre reciba su diagnóstico y copago sin interrupciones.

## 🔄 Flujo general

1. El paciente se autentica con su cédula en el **Frontend (React)** o se registra como un paciente nuevo.
2. El paciente describe sus síntomas en el chat.
3. El frontend desplegado con Vercel envía los datos al **Backend (Node.js/Express)**.
4. El backend implementado con Railway evalúa los síntomas usando `estimator.js` para encontrar la especialidad y el costo.
5. El backend consulta la API de **Groq (Llama-3.3-70b-versatile)** pasando la estimación exacta para generar una narrativa fluida.
6. El backend guarda la estimación en la base de datos de "Historial" en **Notion**.
7. El agente responde al paciente en el chat con los pasos a seguir.

## 📋 Requisitos

* **Node.js** v18 o superior instalado.
* Una cuenta y una integración de **Notion** con acceso a las bases de datos.
* Una API key de **Groq** (para la Inteligencia Artificial).
* Conexión a internet.

## 🛠️ Instalación

El proyecto se divide en dos partes: Frontend y Backend.

### 1. Clonar el repositorio
```bash
git clone https://github.com/leozam02/PruebHackitahon
cd PruebHackitahon
```

### 2. Levantar el Backend
```bash
cd backend
npm install
npm run dev
```

### 3. Levantar el Frontend
Abre otra terminal:
```bash
cd frontend
npm install
npm run dev
```

## 🔐 Variables de entorno

Crea un archivo `.env` en la carpeta `backend/` con las siguientes variables:

```env
GROQ_API_KEY=tu_api_key_de_groq
GROQ_MODEL=llama-3.3-70b-versatile

NOTION_TOKEN=tu_token_de_notion
NOTION_PATIENTS_DB=id_de_la_base_de_pacientes
NOTION_HOSPITALS_DB=id_de_la_base_de_hospitales
NOTION_PLANS_DB=id_de_la_base_de_planes
NOTION_HISTORY_DB=id_de_la_base_de_historial

PORT=3001
FRONTEND_URL=http://localhost:5173
```

## 🗂️ Estructura esperada en Notion

El código asume que existen 4 bases de datos conectadas a la integración:

* **Pacientes:** Propiedades: `Nombre`, `Cédula`, `FechaNacimiento`, `Ciudad`, `Plan` (Relación).
* **Planes:** Propiedades: `Nombre`, `CoberturaPct` (Número), `CopagoFijo` (Número).
* **Hospitales:** Propiedades: `Nombre`, `Ciudad`, `Especialidades` (Multi-select), `CostoConsulta` (Número).
* **Historial:** Propiedades: `Síntoma`, `Paciente` (Relación), `Especialidad`, `Hospital`, `Copago` (Número), `EsUrgencia` (Checkbox), `Fecha` (Created time).

## 🚀 Uso

Accede al frontend en tu navegador mediante `http://localhost:5173`. 
1. Ingresa la cédula de un paciente registrado en Notion.
2. Interactúa con el chat comentando algún dolor o síntoma (Ej. *"tengo un dolor muy fuerte en el ojo"*).
3. La interfaz cambiará a modo oscuro/claro según tu preferencia usando el botón en el menú superior.

## 🏗️ Estructura del proyecto

```text
├── backend/
│   ├── index.js        # API Express, orquestación y endpoints principales
│   ├── notion.js       # Conexión directa y queries a la API de Notion
│   ├── estimator.js    # Motor determinista de especialidades y copagos
├── frontend/
│   ├── src/
│   │   ├── App.jsx     # Interfaz principal, estado del chat y UI del agente
│   │   ├── index.css   # Estilos globales, Modo Oscuro y micro-interacciones
```

## 👥 Autores

Este proyecto fue realizado por miembros del **Club de Inteligencia Artificial Politécnico (CIAP) de ESPOL** para la hackIAthon de Viamatica.

* José Toapanta
* Leonardo Zambrano
* Valeria Noriega

![Texto alternativo](logo_ciap.png)
