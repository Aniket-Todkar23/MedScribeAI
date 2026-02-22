/**
<<<<<<< Updated upstream
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
=======
 * AI Service — Proxy to the FastAPI AI Backend
 * 
 * Forwards requests to the Python FastAPI server for:
 *   - Audio transcription (Whisper + speaker diarization)
 *   - Medical entity extraction (MedGemma)
 *   - EMR record generation (MedGemma)
 *   - Patient summary generation (MedGemma)
 *   - ICD code lookup
 *   - Differential diagnosis suggestions
 */

const axios = require('axios');
const FormData = require('form-data');
const config = require('../config/config');

const AI_BASE_URL = config.ai.baseUrl;

/**
 * POST /api/v1/transcribe — Upload audio → transcription + speaker classification
 * @param {Buffer} fileBuffer - Audio file buffer
 * @param {string} filename  - Original filename
 * @param {string} mimetype  - MIME type (audio/wav, audio/mp3, etc.)
 * @returns {{ transcript, audio_duration_seconds }}
 */
async function transcribeAudio(fileBuffer, filename, mimetype) {
  const form = new FormData();
  form.append('file', fileBuffer, { filename, contentType: mimetype });

  const { data } = await axios.post(`${AI_BASE_URL}/transcribe`, form, {
    headers: form.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 300_000, // 5 min — transcription can be slow
  });
  return data;
}

/**
 * POST /api/v1/extract — Transcript → medical entities (vitals, symptoms, dx, meds…)
 * @param {object} transcript - ClassifiedTranscript object
 * @returns {{ entities }}
 */
async function extractEntities(transcript) {
  const { data } = await axios.post(`${AI_BASE_URL}/extract`, { transcript }, {
    timeout: 120_000,
  });
  return data;
}

/**
 * POST /api/v1/generate-emr — Entities + transcript → structured EMR record
 * @param {object} params
 * @param {object} params.entities   - ExtractedEntities
 * @param {object} params.transcript - ClassifiedTranscript
 * @param {string} [params.patient_id]
 * @param {string} [params.encounter_date]
 * @param {string} [params.encounter_type]
 * @param {number} [params.audio_duration]
 * @param {string} [params.patient_name]
 * @param {string} [params.provider_name]
 * @param {string} [params.facility_name]
 * @returns {{ emr_record }}
 */
async function generateEMR(params) {
  const { data } = await axios.post(`${AI_BASE_URL}/generate-emr`, params, {
    timeout: 120_000,
  });
  return data;
}

/**
 * POST /api/v1/patient-summary — EMR record → patient-friendly summary
 * @param {object} emrRecord - Full EMR record object
 * @returns {{ patient_summary: string }}
 */
async function generatePatientSummary(emrRecord) {
  const { data } = await axios.post(`${AI_BASE_URL}/patient-summary`, {
    emr_record: emrRecord,
  }, {
    timeout: 120_000,
  });
  return data;
}

/**
 * POST /api/v1/icd-lookup — Fuzzy search for ICD codes
 * @param {string} query   - Symptom or condition text
 * @param {number} [version=10] - ICD version (9 or 10)
 * @param {number} [topK=5]
 * @returns {{ query, matches }}
 */
async function icdLookup(query, version = 10, topK = 5) {
  const { data } = await axios.post(`${AI_BASE_URL}/icd-lookup`, {
    query,
    version,
    top_k: topK,
  }, {
    timeout: 30_000,
  });
  return data;
}

/**
 * POST /api/v1/suggest-diagnoses — AI differential diagnosis with ICD mapping
 * @param {object} params
 * @param {Array}  params.symptoms
 * @param {string} [params.age]
 * @param {string} [params.gender]
 * @param {object} [params.social_history]
 * @param {Array}  [params.family_history]
 * @returns {{ suggestions }}
 */
async function suggestDiagnoses(params) {
  const { data } = await axios.post(`${AI_BASE_URL}/suggest-diagnoses`, params, {
    timeout: 120_000,
  });
  return data;
}

/**
 * GET /api/v1/health — Check AI backend health
 */
async function checkHealth() {
  const { data } = await axios.get(`${AI_BASE_URL}/health`, { timeout: 10_000 });
  return data;
}

module.exports = {
  transcribeAudio,
  extractEntities,
  generateEMR,
  generatePatientSummary,
  icdLookup,
  suggestDiagnoses,
  checkHealth,
};
>>>>>>> Stashed changes
