import { useEffect, useMemo, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
const API = '';  // vite proxy → backend

const EMPTY_PATIENT = { id: null, nombre: '', cedula: '', fechaNacimiento: null, ciudad: null, plan: null };

const CITIES = ['Guayaquil', 'Quito', 'Cuenca', 'Ambato', 'Manta', 'Loja', 'Machala', 'Otra'];

const QUICK_PROMPTS = [
  'Tengo dolor de cabeza y fiebre',
  'Siento dolor en el pecho al respirar',
  'Tengo dolor abdominal y náuseas',
  'Me salió una roncha en la piel',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function validateCedula(cedula) {
  if (!/^\d{10}$/.test(cedula)) return false;
  const digits = cedula.split('').map(Number);
  const province = parseInt(cedula.substring(0, 2), 10);
  if (province < 1 || province > 24) return false;
  if (digits[2] >= 6) return false;
  const coeff = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let v = digits[i] * coeff[i];
    if (v >= 10) v -= 9;
    sum += v;
  }
  const verifier = sum % 10 === 0 ? 0 : 10 - (sum % 10);
  return verifier === digits[9];
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

function UrgencyBanner() {
  return (
    <div className="urgency-banner" role="alert">
      <span className="urgency-icon">🚨</span>
      <div>
        <div className="urgency-title">URGENCIA — Ve a Emergencias INMEDIATAMENTE</div>
        <div className="urgency-body">
          No esperes tu turno. Dirígete a la sala de emergencias del hospital más cercano ahora.
        </div>
      </div>
    </div>
  );
}

function EstimateCards({ estimate }) {
  if (!estimate?.recommendedHospital) return null;
  const { specialty, recommendedHospital: h, plan, planCoversSpecialty } = estimate;

  return (
    <div className="estimate-grid">
      {/* Especialidad */}
      <div className="estimate-card">
        <div className="estimate-card__icon">🩺</div>
        <div className="estimate-card__label">Especialidad</div>
        <div className="estimate-card__value">{specialty}</div>
        {!planCoversSpecialty && (
          <span className="plan-not-covered">Tu plan no cubre la original; se recomienda Medicina General</span>
        )}
      </div>

      {/* Hospital */}
      <div className="estimate-card">
        <div className="estimate-card__icon">🏥</div>
        <div className="estimate-card__label">Hospital recomendado</div>
        <div className="estimate-card__value">{h.nombre}</div>
        <div className="estimate-card__sub">{h.direccion}</div>
        <div className="estimate-card__sub" style={{ marginTop: 4 }}>📍 {h.ciudad} · Consulta: ${h.costoConsulta}</div>
      </div>

      {/* Copago */}
      <div className="estimate-card estimate-card--copago">
        <div className="estimate-card__icon">💳</div>
        <div className="estimate-card__label">Tu copago estimado</div>
        <div className="estimate-card__value">${h.copago.toFixed(2)}</div>
        <div className="estimate-card__sub">
          {plan
            ? plan.copagoFijo > 0
              ? `Copago fijo · Plan ${plan.nombre}`
              : `${plan.coberturaPct}% cobertura · Plan ${plan.nombre}`
            : 'Sin plan (pago total)'}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App principal
// ---------------------------------------------------------------------------
function getFriendlyError(err) {
  if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
    return 'Sin conexión al servidor. Revisa tu internet o intenta de nuevo.';
  }
  return err.message;
}

export default function App() {
  // Tema oscuro
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // Modo de acceso
  const [accessMode, setAccessMode] = useState('cedula'); // 'cedula' | 'register'

  // Cédula
  const [cedula, setCedula] = useState('');
  const [cedulaError, setCedulaError] = useState('');

  // Paciente
  const [patient, setPatient] = useState(EMPTY_PATIENT);
  const [identifying, setIdentifying] = useState(false);
  const [idError, setIdError] = useState('');

  // Formulario registro
  const [regNombre, setRegNombre] = useState('');
  const [regCedula, setRegCedula] = useState('');
  const [regFecha, setRegFecha] = useState('');
  const [regCiudad, setRegCiudad] = useState('');
  const [regPlanId, setRegPlanId] = useState('');
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState('');

  // Chat
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');

  // Estimación determinista
  const [estimate, setEstimate] = useState(null);

  const chatBodyRef = useRef(null);
  const isIdentified = Boolean(patient?.id);
  const canChat = isIdentified;

  // ---------------------------------------------------------------------------
  // Efectos
  // ---------------------------------------------------------------------------
  // Auto-scroll chat
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  // Cargar planes cuando el usuario elige "Registrarme"
  useEffect(() => {
    if (accessMode === 'register' && plans.length === 0) {
      setPlansLoading(true);
      fetch(`${API}/api/plans`)
        .then((r) => r.json())
        .then((data) => setPlans(Array.isArray(data) ? data : []))
        .catch(() => setPlans([]))
        .finally(() => setPlansLoading(false));
    }
  }, [accessMode]);

  // ---------------------------------------------------------------------------
  // Historial de mensajes para el payload del chat
  // ---------------------------------------------------------------------------
  const historyPayload = useMemo(
    () => messages.map((m) => ({ role: m.role, content: m.content })),
    [messages]
  );

  // ---------------------------------------------------------------------------
  // Handlers de acceso
  // ---------------------------------------------------------------------------
  function resetChat() {
    setMessages([]);
    setEstimate(null);
    setChatError('');
  }

  function switchMode(mode) {
    setAccessMode(mode);
    setIdError('');
    setRegError('');
    setCedulaError('');
    setPatient(EMPTY_PATIENT);
    resetChat();
  }

  // Modo Cédula
  async function handleIdentify(e) {
    e.preventDefault();
    setCedulaError('');
    setIdError('');

    if (!validateCedula(cedula.trim())) {
      setCedulaError('Cédula ecuatoriana inválida (10 dígitos, verificada).');
      return;
    }

    setIdentifying(true);
    try {
      const res = await fetch(`${API}/api/identify-patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula: cedula.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo identificar al paciente.');
      setPatient(data);
      resetChat();
      setMessages([{ role: 'assistant', content: `Hola ${data.nombre}, cuéntame qué síntomas tienes hoy.` }]);
    } catch (err) {
      setIdError(getFriendlyError(err));
      setPatient(EMPTY_PATIENT);
    } finally {
      setIdentifying(false);
    }
  }


  // Modo Registro
  async function handleRegister(e) {
    e.preventDefault();
    setRegError('');

    if (!regNombre.trim()) { setRegError('El nombre es requerido.'); return; }
    if (!validateCedula(regCedula.trim())) { setRegError('Cédula ecuatoriana inválida.'); return; }

    setRegistering(true);
    try {
      const res = await fetch(`${API}/api/register-patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: regNombre.trim(),
          cedula: regCedula.trim(),
          fechaNacimiento: regFecha || null,
          ciudad: regCiudad || null,
          planId: regPlanId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar.');
      setPatient(data);
      resetChat();
      setMessages([{ role: 'assistant', content: `¡Bienvenido/a ${data.nombre}! Tu registro fue exitoso. Cuéntame qué síntomas tienes.` }]);
    } catch (err) {
      setRegError(getFriendlyError(err));
    } finally {
      setRegistering(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Envío de mensaje
  // ---------------------------------------------------------------------------
  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || !canChat) return;

    const userMsg = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setChatError('');

    const modoAcceso = accessMode;

    try {
      // 1) Estimación determinista primero (así Gemini recibe datos exactos)
      let freshEstimate = estimate;
      try {
        const estRes = await fetch(`${API}/api/estimate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symptomText: userMsg.content,
            patient: patient?.id ? patient : null,
            modoAcceso,
          }),
        });
        const estData = await estRes.json();
        if (!estData.error && estData.hasSymptom) {
          // Solo actualizar cards y contexto IA si el mensaje contiene un síntoma real
          freshEstimate = estData;
          setEstimate(estData);
        }
        // Si no hay síntoma (ej. responde "sí"), freshEstimate mantiene el valor anterior (contexto previo)
      } catch (_) { /* no bloquea el chat si falla */ }

      // 2) Narrativa Gemini con el estimate ya calculado
      const chatRes = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          history: [...historyPayload, userMsg],
          patient: patient?.id ? patient : null,
          estimate: freshEstimate,
        }),
      });
      const chatData = await chatRes.json();

      if (chatData?.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: chatData.reply }]);
      } else {
        setChatError(chatData?.error || 'No se pudo obtener respuesta.');
      }
    } catch (err) {
      setChatError(getFriendlyError(err));
    } finally {
      setSending(false);
    }
  }

  function handlePromptClick(prompt) { setInput(prompt); }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const planLabel = patient?.plan?.nombre || 'Sin plan';
  const coverageLabel =
    patient?.plan?.coberturaPct !== undefined
      ? `${patient.plan.coberturaPct}% cobertura`
      : 'Cobertura no registrada';

  let statusLabel = 'Pendiente';
  let statusClass = 'status';
  if (isIdentified) { statusLabel = 'Identificado'; statusClass = 'status status--ok'; }

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------
  return (
    <div className="page">
      <div className="bg-orb bg-orb--left" />
      <div className="bg-orb bg-orb--right" />

      <header className="hero">
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div>
            <div className="eyebrow">Red Médica Viamática</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <h1>MediCopago AI</h1>
              <button className="theme-toggle" onClick={toggleTheme} aria-label="Cambiar tema">
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </div>
            <p className="subtitle">Descubre tu cobertura y estima tu copago al instante con nuestro asistente experto.</p>
          </div>
        </div>
        <div className="hero-card">
          <div className="hero-stat"><span className="stat-number">7</span><span className="stat-label">Especialidades</span></div>
          <div className="hero-stat"><span className="stat-number">14</span><span className="stat-label">Hospitales en red</span></div>
          <div className="hero-stat"><span className="stat-number">IA</span><span className="stat-label">Llama 3</span></div>
        </div>
      </header>

      <main className="layout">
        {/* ── Panel izquierdo ───────────────────────────── */}
        <section className="panel panel--left">
          <div className="panel-header">
            <h2>Acceso</h2>
            <p>Identifícate para calcular tu copago exacto.</p>
          </div>

          <div className="card">
            {/* Tabs */}
            <div className="access-tabs" role="tablist">
              {[
                { key: 'cedula', label: '🔍 Cédula' },
                { key: 'register', label: '✏️ Registrarme' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={accessMode === key}
                  className={`access-tab${accessMode === key ? ' active' : ''}`}
                  onClick={() => switchMode(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab: Cédula */}
            {accessMode === 'cedula' && (
              <form onSubmit={handleIdentify}>
                <label className="field">
                  Cédula del paciente
                  <input
                    id="cedula-input"
                    type="text"
                    placeholder="Ej: 0921234563"
                    value={cedula}
                    maxLength={10}
                    onChange={(e) => { setCedula(e.target.value); setCedulaError(''); }}
                  />
                </label>
                {cedulaError && <p className="alert">{cedulaError}</p>}
                {idError && <p className="alert">{idError}</p>}
                <button className="primary" type="submit" disabled={identifying}>
                  {identifying ? 'Buscando...' : 'Buscar paciente'}
                </button>
              </form>
            )}

            {/* Tab: Registrarme */}
            {accessMode === 'register' && (
              <form onSubmit={handleRegister}>
                <label className="field">
                  Nombre completo
                  <input type="text" placeholder="Juan Pérez" value={regNombre} onChange={(e) => setRegNombre(e.target.value)} />
                </label>
                <label className="field">
                  Cédula
                  <input type="text" placeholder="0921234563" maxLength={10} value={regCedula} onChange={(e) => setRegCedula(e.target.value)} />
                </label>
                <label className="field">
                  Fecha de nacimiento <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(opcional)</span>
                  <input type="date" value={regFecha} onChange={(e) => setRegFecha(e.target.value)} />
                </label>
                <label className="field">
                  Ciudad
                  <select value={regCiudad} onChange={(e) => setRegCiudad(e.target.value)}>
                    <option value="">Selecciona tu ciudad</option>
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="field">
                  Plan de seguro <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(opcional)</span>
                  <select value={regPlanId} onChange={(e) => setRegPlanId(e.target.value)} disabled={plansLoading}>
                    <option value="">{plansLoading ? 'Cargando planes...' : 'Sin plan / No tengo'}</option>
                    {plans.map((p) => <option key={p.id} value={p.id}>{p.nombre} — {p.coberturaPct}% cob.</option>)}
                  </select>
                </label>
                {regError && <p className="alert">{regError}</p>}
                <button className="primary" type="submit" disabled={registering}>
                  {registering ? 'Registrando...' : 'Crear cuenta y continuar'}
                </button>
              </form>
            )}
          </div>

          {/* Tarjeta del paciente */}
          <div className="card patient-card">
            <div>
              <p className="card-label">Paciente</p>
              <h3 style={{ margin: '0 0 4px' }}>{isIdentified ? patient.nombre : 'Sin identificar'}</h3>
              {isIdentified && <p className="card-meta">Cédula: {patient.cedula}</p>}
              {isIdentified && <p className="card-meta">Nacimiento: {patient.fechaNacimiento || '--'}</p>}
            </div>
            <div className="pill-group">
              <span className="pill">{planLabel}</span>
              {isIdentified && <span className="pill pill--soft">{coverageLabel}</span>}
              {(isIdentified && patient.ciudad) && <span className="pill pill--city">📍 {patient.ciudad}</span>}
            </div>
          </div>

          {/* Cómo funciona */}
          <div className="card info-card">
            <h3 style={{ margin: '0 0 10px' }}>¿Cómo funciona?</h3>
            <ol>
              <li>Identifícate por cédula o regístrate.</li>
              <li>Describe tus síntomas en el chat.</li>
              <li>Recibe especialidad, hospital en red y copago exacto.</li>
            </ol>
          </div>
        </section>

        {/* ── Panel derecho (chat) ─────────────────────── */}
        <section className="panel panel--right">
          <div className="panel-header">
            <h2>Chat médico</h2>
            <p>Conversación asistida para definir especialidad y copago.</p>
          </div>

          <div className="card chat-card">
            {/* Header chat */}
            <div className="chat-header">
              <div>
                <h3 style={{ margin: 0 }}>Asistente MediCopago</h3>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>
                  {isIdentified ? `Paciente: ${patient.nombre}` : 'Paciente no identificado'}
                </p>
              </div>
              <span className={statusClass}>{statusLabel}</span>
            </div>

            {/* Urgency banner */}
            {estimate?.isUrgent && <UrgencyBanner />}

            {/* Estimate cards */}
            {estimate && <EstimateCards estimate={estimate} />}

            {/* Chat body */}
            <div className="chat-body" ref={chatBodyRef}>
              {messages.length === 0 ? (
                <div className="empty-state">
                  <p>{canChat ? 'Cuéntame tus síntomas para comenzar.' : 'Identifícate primero para iniciar el chat.'}</p>
                  <div className="prompt-grid">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="prompt"
                        onClick={() => handlePromptClick(prompt)}
                        disabled={!canChat}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="message-list">
                  {messages.map((msg, idx) => (
                  <div key={idx} className={`msg ${msg.role === 'assistant' ? 'msg-bot' : 'msg-user'}`}>
                    <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                  </div>
                ))}
                  {sending && (
                    <div className="message message--assistant">
                      <span style={{ color: 'var(--muted)' }}>Analizando…</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input */}
            <form className="chat-input" onSubmit={handleSend}>
              <textarea
                id="chat-textarea"
                placeholder={canChat ? 'Escribe tus síntomas...' : 'Identifícate primero...'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={3}
                disabled={!canChat || sending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); }
                }}
              />
              <div className="chat-actions">
                {chatError && <p className="alert" style={{ margin: 0 }}>{chatError}</p>}
                <button
                  id="chat-send-btn"
                  className="chat-send"
                  type="submit"
                  disabled={!canChat || sending || !input.trim()}
                >
                  {sending ? 'Enviando...' : 'Enviar →'}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
