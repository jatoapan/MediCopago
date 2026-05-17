// export const generateFinalResponse = async (specialty, hospitalName, planName, copay, urgency) => {
//   try {
//     const response = await fetch('/api/generate-final-response', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ specialty, hospitalName, planName, copay, urgency })
//     });
//     if (!response.ok) throw new Error('Error en generar');
//     return await response.json();
//   } catch (error) {
//     console.error('Error:', error);
//     return { error: 'No se pudo generar la respuesta' };
//   }
// };


export const generateFinalResponse = async (patient, analysis, coverage) => {
  try {
    console.log("Payload final:", { patient, analysis, coverage });

    const response = await fetch('http://localhost:3001/api/generate-final-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient, analysis, coverage })
    });

    console.log("Status final response:", response.status);

    const data = await response.json();
    console.log("Respuesta final:", data);

    if (!response.ok) {
      throw new Error(data.error || 'Error en generar respuesta final');
    }

    return data;
  } catch (error) {
    console.error('Error generateFinalResponse:', error);

    return {
      message: 'No se pudo generar la respuesta final.'
    };
  }
};