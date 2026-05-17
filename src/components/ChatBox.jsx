import { useState } from 'react';
import { patients } from '../data/patients.js';
import { analyzeSymptoms } from '../services/aiSymptomAgent.js';
import { generateFinalResponse } from '../services/responseAgent.js';
import { calculateCoverage } from '../services/coverageService.js';
import '../styles/ChatBox.css';

export default function ChatBox() {
  const [selectedPatient, setSelectedPatient] = useState(patients[0]);
  const [symptoms, setSymptoms] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [coverage, setCoverage] = useState(null);
  const [finalResponse, setFinalResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!symptoms.trim()) {
      alert('Por favor, describe tus sintomas');
      return;
    }

    setLoading(true);

    try {
      const result = await analyzeSymptoms(symptoms);
      console.log('Resultado IA:', result);

      if (result.error) {
        alert(result.error);
        return;
      }

      setAnalysis(result);

      const coverageResult = calculateCoverage(
        selectedPatient,
        result.especialidad_sugerida
      );

      console.log('Resultado cobertura:', coverageResult);

      if (!coverageResult || coverageResult.error) {
        setCoverage(null);
        setFinalResponse({
          message: 'No se encontró cobertura u hospital disponible para esa especialidad.'
        });
        return;
      }

      setCoverage(coverageResult);

      const patientWithPlan = {
        ...selectedPatient,
        plan: coverageResult.plan?.name || selectedPatient.plan || ''
      };

      const finalResp = await generateFinalResponse(
        patientWithPlan,
        result,
        coverageResult
      );

      setFinalResponse(finalResp);
    } catch (error) {
      console.error('Error en handleAnalyze:', error);
      setFinalResponse({
        response: 'Ocurrió un error al procesar la consulta.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='app-wrapper'>
      <div className='chatbox-container'>
      <h1>MediCopago AI</h1>
      <p>Estima tu copago medico al instante</p>

      <div className='form-group'>
        <label>Selecciona tu perfil:</label>
        <select value={selectedPatient.id} onChange={(e) => setSelectedPatient(patients.find(p => p.id == e.target.value))}>
          {patients.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
        </select>
      </div>

      <div className='form-group'>
        <label>Describe tus sintomas:</label>
        <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder='Escribe aqui...' />
      </div>

      <button onClick={handleAnalyze} disabled={loading}>{loading ? 'Analizando...' : 'Analizar'}</button>

      {analysis && (
        <div className='results'>
          <h3>Análisis de Síntomas</h3>
          <p><strong>Especialidad:</strong> {analysis.especialidad_sugerida}</p>
          <p><strong>Urgencia:</strong> {analysis.nivel_urgencia}</p>
          <p><strong>Síntomas:</strong> {analysis.sintomas_detectados.join(', ')}</p>
          <p><strong>Resumen:</strong> {analysis.resumen || 'No hay resumen disponible'}</p>
          
          {coverage && !coverage.error && (
            <div className="results-divider">
              <p>
                <strong>Hospital:</strong>{" "}
                {coverage.bestHospital?.name || coverage.hospital?.name || "No disponible"}
              </p>

              <p>
                <strong>Plan:</strong>{" "}
                {coverage.plan?.name || "No disponible"}
              </p>

              <p>
                <strong>Copago Estimado:</strong>{" "}
                ${coverage.copay ?? coverage.copago ?? "No disponible"}
              </p>
            </div>
          )}
        </div>
      )}

      {finalResponse && (
        <div className='final-response'>
          <h3>Respuesta generada</h3>
          <p>{finalResponse.message || finalResponse.response}</p>
        </div>
      )}
      </div>
    </div>
  );
}