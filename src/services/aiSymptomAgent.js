export const analyzeSymptoms = async (symptoms) => {
  try {
    console.log("Frontend enviando síntomas:", symptoms);

    const response = await fetch('http://localhost:3001/api/analyze-symptoms', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ symptoms })
    });

    console.log("Status analyze:", response.status);

    const data = await response.json();

    console.log("Respuesta analyze:", data);

    if (!response.ok) {
      throw new Error(data.error || 'Error en analyze');
    }

    return data;

  } catch (error) {
    console.error('Error analyzeSymptoms:', error);

    return { 
      error: 'No se pudo analizar los síntomas' 
    };
  }
};