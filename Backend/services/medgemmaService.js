/**
 * MedGemma Service — Direct calls to Modal-hosted MedGemma 27B
 * Used for generating doctor summaries, patient summaries, and PDF content
 */

const axios = require('axios');

const MEDGEMMA_URL =
  process.env.MODAL_MEDGEMMA_URL ||
  'https://shubhammore070804--medgemma-27b-medgemma27bserver-serve.modal.run/v1/chat/completions';

/**
 * Generic MedGemma chat completion call
 */
async function callMedGemma(messages, maxTokens = 2048, temperature = 0.1) {
  const { data } = await axios.post(
    MEDGEMMA_URL,
    {
      model: 'medgemma-27b-it',
      messages,
      max_tokens: maxTokens,
      temperature,
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 180_000 },
  );
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Generate a DOCTOR summary (technical, clinical)
 */
async function generateDoctorSummary({ transcript, entities, patientDetails }) {
  const prompt = `You are a medical documentation AI. Based on the consultation transcript, extracted medical entities, and patient details, generate a comprehensive CLINICAL SUMMARY for the treating physician.

PATIENT DETAILS:
${JSON.stringify(patientDetails, null, 2)}

EXTRACTED MEDICAL ENTITIES:
${JSON.stringify(entities, null, 2)}

CONSULTATION TRANSCRIPT:
${transcript}

Generate a structured clinical summary in JSON format with these sections:
{
  "chief_complaint": "Brief CC",
  "history_of_present_illness": "Detailed HPI narrative",
  "review_of_systems": "ROS findings",
  "physical_examination": "PE findings with vitals",
  "assessment": "Clinical assessment with differential diagnoses",
  "plan": ["Treatment plan items"],
  "diagnoses": [{"condition": "...", "icd_code": "...", "status": "active/resolved"}],
  "medications_prescribed": [{"drug": "...", "dosage": "...", "frequency": "...", "duration": "..."}],
  "lab_orders": ["ordered tests"],
  "follow_up": "Follow-up instructions",
  "clinical_notes": "Additional clinical observations"
}

Return ONLY valid JSON.`;

  const raw = await callMedGemma([{ role: 'user', content: prompt }], 3000, 0.05);
  return parseJSON(raw);
}

/**
 * Generate a PATIENT summary (non-technical, easy to understand)
 */
async function generatePatientSummary({ transcript, entities, patientDetails, doctorName }) {
  const prompt = `You are a friendly and caring healthcare communication assistant. Based on the consultation details below, create an EASY-TO-UNDERSTAND health summary for the patient. The patient may not have any medical background, so use simple everyday language. Avoid all medical jargon.

PATIENT NAME: ${patientDetails?.full_name || 'Patient'}
DOCTOR: ${doctorName || 'Your Doctor'}

EXTRACTED MEDICAL INFORMATION:
${JSON.stringify(entities, null, 2)}

CONSULTATION TRANSCRIPT:
${transcript}

Generate a patient-friendly summary in JSON format:
{
  "greeting": "A warm greeting addressing the patient by name",
  "visit_summary": "A simple 2-3 sentence summary of what happened during the visit",
  "what_we_found": [
    {"finding": "Simple description of a finding", "explanation": "What it means in everyday terms"}
  ],
  "your_diagnosis": "Simple explanation of what's going on with their health",
  "medications": [
    {"name": "Drug name", "why": "Why you need this", "how_to_take": "Simple instructions", "important_notes": "Side effects or warnings in simple terms"}
  ],
  "things_to_do": [
    {"action": "What to do", "why": "Why it helps", "details": "Step by step if needed"}
  ],
  "diet_recommendations": [
    {"food_group": "Category", "eat_more": ["foods to eat"], "eat_less": ["foods to avoid"], "tip": "Simple tip"}
  ],
  "lifestyle_changes": ["Simple lifestyle advice"],
  "warning_signs": ["When to call the doctor or go to ER - in simple terms"],
  "next_appointment": "When to come back and why",
  "recovery_timeline": "What to expect in coming days/weeks in simple terms",
  "questions_to_ask": ["Suggested questions the patient might want to ask next time"],
  "encouraging_note": "A positive, encouraging closing message"
}

IMPORTANT: Use simple, warm language. Explain everything like you're talking to a friend who doesn't know medical terms. Be encouraging and supportive.

Return ONLY valid JSON.`;

  const raw = await callMedGemma([{ role: 'user', content: prompt }], 3500, 0.15);
  return parseJSON(raw);
}

/**
 * Extract medical entities using MedGemma directly (used when FastAPI is not available)
 */
async function extractEntitiesDirect(transcript) {
  const prompt = `Extract medical entities from this consultation transcript. Return JSON with: vitals, symptoms, diagnoses, medications, allergies, lab_results, procedures, medical_history.

Transcript:
${transcript}

Return JSON:
{
  "vitals": [{"type": "...", "value": "...", "unit": "..."}],
  "symptoms": [{"name": "...", "severity": "...", "duration": "...", "icd_codes": [{"code": "...", "description": "..."}]}],
  "diagnoses": [{"condition": "...", "status": "...", "icd_codes": [{"code": "...", "description": "..."}]}],
  "medications": [{"name": "...", "dosage": "...", "frequency": "...", "route": "..."}],
  "allergies": [{"allergen": "...", "reaction": "...", "severity": "..."}],
  "lab_results": [{"test": "...", "value": "...", "unit": "...", "reference_range": "..."}],
  "procedures": [{"name": "...", "date": "...", "notes": "..."}],
  "medical_history": [{"condition": "...", "onset": "...", "status": "..."}]
}

Return ONLY valid JSON.`;

  const raw = await callMedGemma([{ role: 'user', content: prompt }], 2048, 0.05);
  return parseJSON(raw);
}

/* ─── helpers ─── */

function parseJSON(raw) {
  try {
    // Strip markdown fences
    let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    // Find the JSON object/array
    const startIdx = cleaned.indexOf('{');
    const arrIdx = cleaned.indexOf('[');
    const idx = startIdx === -1 ? arrIdx : arrIdx === -1 ? startIdx : Math.min(startIdx, arrIdx);
    if (idx > 0) cleaned = cleaned.substring(idx);
    // Find matching end
    let depth = 0;
    let endIdx = -1;
    const openChar = cleaned[0];
    const closeChar = openChar === '{' ? '}' : ']';
    for (let i = 0; i < cleaned.length; i++) {
      if (cleaned[i] === openChar) depth++;
      else if (cleaned[i] === closeChar) { depth--; if (depth === 0) { endIdx = i + 1; break; } }
    }
    if (endIdx > 0) cleaned = cleaned.substring(0, endIdx);
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('[MedGemma] JSON parse error:', e.message);
    return { raw_text: raw, parse_error: true };
  }
}

module.exports = {
  callMedGemma,
  generateDoctorSummary,
  generatePatientSummary,
  extractEntitiesDirect,
};
