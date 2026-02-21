/**
 * AI Service — stub implementations.
 * Replace with real LLM calls (OpenAI / Azure OpenAI) when ready.
 */

/**
 * General-purpose AI chat.
 */
const chat = async ({ message, context }) => {
  // TODO: integrate with OpenAI / Azure OpenAI
  return {
    role: 'assistant',
    text: `Based on the available clinical data, here is my analysis:\n\n` +
          `You asked: "${message}"\n\n` +
          `This is a simulated AI response. In production, this will be powered by a clinical LLM ` +
          `with access to the patient's EMR data for evidence-based suggestions.\n\n` +
          `Key capabilities:\n` +
          `• Clinical decision support\n` +
          `• Drug interaction checking\n` +
          `• Differential diagnosis suggestions\n` +
          `• Patient history summarization`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
};

/**
 * Generate SOAP note from transcription.
 */
const generateSoapNote = async ({ transcription, patient_context }) => {
  // TODO: integrate with clinical LLM
  return {
    subjective: 'Patient reports chest discomfort during physical activity, specifically when climbing stairs. ' +
                'Describes the sensation as pressure-like in the center of the chest, resolving with rest within 2-3 minutes. ' +
                'Also notes occasional tingling in the left arm. Has been compliant with medications (Metformin, Atorvastatin, Nitroglycerin). ' +
                'Used Nitroglycerin twice this week for symptom relief.',
    objective:  'BP: 138/88 mmHg (slightly elevated). HR: 82 bpm. ' +
                'Patient appears in no acute distress. Cardiovascular exam pending stress test results.',
    assessment: 'Stable angina pectoris with ongoing exertional symptoms. ' +
                'Hypertension - borderline, needs monitoring. ' +
                'Type 2 Diabetes - on current regimen.',
    plan:       '1. Order cardiac stress test to evaluate heart function under exertion.\n' +
                '2. Review most recent lab results (lipid panel, HbA1c).\n' +
                '3. Continue current medications.\n' +
                '4. Follow-up in 2 weeks for stress test results.\n' +
                '5. Patient education: report any worsening symptoms or chest pain at rest immediately.',
  };
};

/**
 * Generate ICD-10 codes from diagnosis/transcription.
 */
const generateIcdCodes = async ({ transcription, diagnosis }) => {
  // TODO: integrate with clinical LLM / ICD code database
  return [
    { code: 'I20.9',  description: 'Angina pectoris, unspecified' },
    { code: 'I10',    description: 'Essential (primary) hypertension' },
    { code: 'E11.9',  description: 'Type 2 diabetes mellitus without complications' },
    { code: 'R07.9',  description: 'Chest pain, unspecified' },
  ];
};

module.exports = { chat, generateSoapNote, generateIcdCodes };
