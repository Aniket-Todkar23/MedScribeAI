/**
 * PDF Service — Generate consultation PDFs using the `docx` library
 * We actually use HTML-to-buffer approach with a simple in-memory PDF-like document.
 * Since we already have `docx` installed, we generate DOCX which is universally readable.
 * For true PDF we'd need puppeteer/pdfkit - using DOCX for now (better for medical docs anyway).
 *
 * UPDATE: Using a lightweight HTML approach that produces a clean buffer for email attachment.
 */

/**
 * Generate a clinical PDF buffer for the doctor
 */
async function generateDoctorPDF({ consultation_id, patient, doctor, summary, entities, icdCodes, date }) {
  const html = buildDoctorHTML({ consultation_id, patient, doctor, summary, entities, icdCodes, date });
  return Buffer.from(html, 'utf-8');
}

/**
 * Generate a patient-friendly PDF buffer
 */
async function generatePatientPDF({ consultation_id, patient, doctor, summary, date }) {
  const html = buildPatientHTML({ consultation_id, patient, doctor, summary, date });
  return Buffer.from(html, 'utf-8');
}

/* ═══════════════════════ HTML BUILDERS ═══════════════════════ */

function buildDoctorHTML({ consultation_id, patient, doctor, summary, entities, icdCodes, date }) {
  const fmtDate = new Date(date || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const diagnosisRows = (summary.diagnoses || []).map(d =>
    `<tr><td>${d.condition || ''}</td><td>${d.icd_code || ''}</td><td>${d.status || 'active'}</td></tr>`
  ).join('');

  const medRows = (summary.medications_prescribed || []).map(m =>
    `<tr><td>${m.drug || m.name || ''}</td><td>${m.dosage || ''}</td><td>${m.frequency || ''}</td><td>${m.duration || ''}</td></tr>`
  ).join('');

  const labOrders = (summary.lab_orders || []).map(l => `<li>${l}</li>`).join('');
  const planItems = (summary.plan || []).map(p => `<li>${p}</li>`).join('');

  const vitalsHTML = (entities.vitals || []).map(v =>
    `<span style="display:inline-block;margin:4px 8px 4px 0;padding:4px 10px;background:#f0f9ff;border-radius:6px;font-size:13px;"><strong>${v.type}:</strong> ${v.value}${v.unit ? ' ' + v.unit : ''}</span>`
  ).join('');

  const icdHTML = (icdCodes || []).map(c =>
    `<span style="display:inline-block;margin:2px 6px 2px 0;padding:3px 8px;background:#fef3c7;border-radius:4px;font-size:12px;">${c.code || ''}: ${c.description || ''}</span>`
  ).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Clinical Report - ${consultation_id}</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;color:#1e293b;font-size:14px;line-height:1.6}
  .page{max-width:800px;margin:0 auto;padding:40px}
  .header{background:linear-gradient(135deg,#0B3C3D,#1F9FA3);color:white;padding:24px 32px;border-radius:12px;margin-bottom:24px}
  .header h1{margin:0;font-size:22px;font-weight:700} .header p{margin:4px 0 0;opacity:.85;font-size:13px}
  .section{background:white;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin-bottom:16px}
  .section h2{font-size:15px;font-weight:700;color:#0B3C3D;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #1F9FA3}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#f1f5f9;text-align:left;padding:8px 12px;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0}
  td{padding:8px 12px;border-bottom:1px solid #f1f5f9}
  .meta{display:flex;gap:24px;flex-wrap:wrap;font-size:13px;color:#64748b}
  .meta span{display:flex;align-items:center;gap:4px}
  .footer{text-align:center;font-size:11px;color:#94a3b8;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0}
</style></head><body>
<div class="page">
  <div class="header">
    <h1>Diagnostic-IQ — Clinical Consultation Report</h1>
    <p>Consultation ID: ${consultation_id} &nbsp;|&nbsp; Date: ${fmtDate}</p>
  </div>

  <div class="section">
    <h2>Patient & Provider</h2>
    <div class="meta">
      <span><strong>Patient:</strong> ${patient.full_name || 'N/A'}</span>
      <span><strong>DOB:</strong> ${patient.date_of_birth || 'N/A'}</span>
      <span><strong>Gender:</strong> ${patient.gender || 'N/A'}</span>
      <span><strong>Blood Group:</strong> ${patient.blood_group || 'N/A'}</span>
    </div>
    <div class="meta" style="margin-top:8px">
      <span><strong>Provider:</strong> ${doctor?.name || 'N/A'}</span>
      <span><strong>Specialization:</strong> ${doctor?.specialization || 'N/A'}</span>
    </div>
  </div>

  ${vitalsHTML ? `<div class="section"><h2>Vitals</h2>${vitalsHTML}</div>` : ''}

  <div class="section">
    <h2>Chief Complaint</h2>
    <p>${summary.chief_complaint || 'N/A'}</p>
  </div>

  <div class="section">
    <h2>History of Present Illness</h2>
    <p>${summary.history_of_present_illness || 'N/A'}</p>
  </div>

  ${summary.review_of_systems ? `<div class="section"><h2>Review of Systems</h2><p>${summary.review_of_systems}</p></div>` : ''}

  <div class="section">
    <h2>Physical Examination</h2>
    <p>${summary.physical_examination || 'N/A'}</p>
  </div>

  <div class="section">
    <h2>Assessment</h2>
    <p>${summary.assessment || 'N/A'}</p>
  </div>

  ${diagnosisRows ? `<div class="section"><h2>Diagnoses</h2><table><tr><th>Condition</th><th>ICD Code</th><th>Status</th></tr>${diagnosisRows}</table></div>` : ''}

  ${icdHTML ? `<div class="section"><h2>ICD Codes</h2>${icdHTML}</div>` : ''}

  ${planItems ? `<div class="section"><h2>Treatment Plan</h2><ol>${planItems}</ol></div>` : ''}

  ${medRows ? `<div class="section"><h2>Medications</h2><table><tr><th>Drug</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr>${medRows}</table></div>` : ''}

  ${labOrders ? `<div class="section"><h2>Lab Orders</h2><ul>${labOrders}</ul></div>` : ''}

  <div class="section">
    <h2>Follow-up</h2>
    <p>${summary.follow_up || 'As needed'}</p>
  </div>

  ${summary.clinical_notes ? `<div class="section"><h2>Clinical Notes</h2><p>${summary.clinical_notes}</p></div>` : ''}

  <div class="footer">
    <p>Generated by Diagnostic-IQ Smart EMR &nbsp;|&nbsp; This is a computer-generated document</p>
    <p>Confidential — For authorized medical personnel only</p>
  </div>
</div></body></html>`;
}

function buildPatientHTML({ consultation_id, patient, doctor, summary, date }) {
  const fmtDate = new Date(date || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const medications = (summary.medications || []).map(m =>
    `<div style="background:#f0f9ff;border-radius:10px;padding:14px 18px;margin-bottom:10px;">
      <div style="font-weight:700;color:#0B3C3D;font-size:15px;">${m.name || ''}</div>
      <div style="color:#475569;font-size:13px;margin-top:4px;"><strong>Why:</strong> ${m.why || ''}</div>
      <div style="color:#475569;font-size:13px;"><strong>How to take:</strong> ${m.how_to_take || ''}</div>
      ${m.important_notes ? `<div style="color:#DC2626;font-size:12px;margin-top:4px;">⚠️ ${m.important_notes}</div>` : ''}
    </div>`
  ).join('');

  const findings = (summary.what_we_found || []).map(f =>
    `<div style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
      <div style="font-weight:600;color:#0B3C3D;">${f.finding || ''}</div>
      <div style="color:#64748B;font-size:13px;">${f.explanation || ''}</div>
    </div>`
  ).join('');

  const todos = (summary.things_to_do || []).map((t, i) =>
    `<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9;">
      <div style="width:28px;height:28px;border-radius:50%;background:#1F9FA3;color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">${i + 1}</div>
      <div>
        <div style="font-weight:600;color:#0B3C3D;">${t.action || ''}</div>
        <div style="color:#64748B;font-size:13px;">${t.why || ''}</div>
        ${t.details ? `<div style="color:#94A3B8;font-size:12px;margin-top:2px;">${t.details}</div>` : ''}
      </div>
    </div>`
  ).join('');

  const dietHTML = (summary.diet_recommendations || []).map(d =>
    `<div style="background:#f0fdf4;border-radius:10px;padding:14px 18px;margin-bottom:10px;">
      <div style="font-weight:700;color:#166534;font-size:14px;">🥗 ${d.food_group || ''}</div>
      ${d.eat_more?.length ? `<div style="color:#16a34a;font-size:13px;margin-top:4px;">✅ Eat more: ${d.eat_more.join(', ')}</div>` : ''}
      ${d.eat_less?.length ? `<div style="color:#dc2626;font-size:13px;">❌ Eat less: ${d.eat_less.join(', ')}</div>` : ''}
      ${d.tip ? `<div style="color:#64748B;font-size:12px;margin-top:4px;">💡 ${d.tip}</div>` : ''}
    </div>`
  ).join('');

  const warnings = (summary.warning_signs || []).map(w =>
    `<div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;">
      <span style="color:#DC2626;">🚨</span>
      <span style="color:#7F1D1D;font-size:13px;">${w}</span>
    </div>`
  ).join('');

  const lifestyle = (summary.lifestyle_changes || []).map(l =>
    `<li style="padding:4px 0;color:#475569;">${l}</li>`
  ).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Your Health Summary</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;color:#1e293b;font-size:14px;line-height:1.7;background:#f8fafc}
  .page{max-width:650px;margin:0 auto;padding:20px}
  .header{background:linear-gradient(135deg,#1F9FA3,#0B3C3D);color:white;padding:28px 32px;border-radius:16px;margin-bottom:20px;text-align:center}
  .header h1{margin:0;font-size:24px;font-weight:700} .header p{margin:6px 0 0;opacity:.85;font-size:14px}
  .card{background:white;border-radius:14px;padding:22px 26px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.06)}
  .card h2{font-size:17px;font-weight:700;color:#0B3C3D;margin:0 0 14px;display:flex;align-items:center;gap:8px}
  .greeting{font-size:16px;color:#334155;line-height:1.8}
  .footer{text-align:center;font-size:12px;color:#94a3b8;margin-top:20px;padding:16px}
</style></head><body>
<div class="page">
  <div class="header">
    <h1>🏥 Your Health Summary</h1>
    <p>Consultation on ${fmtDate} with ${doctor?.name || 'Your Doctor'}</p>
    <p style="font-size:11px;opacity:.7;">Reference: ${consultation_id}</p>
  </div>

  <div class="card">
    <p class="greeting">${summary.greeting || `Dear ${patient.full_name || 'Patient'},`}</p>
    <p class="greeting">${summary.visit_summary || ''}</p>
  </div>

  ${findings ? `<div class="card"><h2>🔍 What We Found</h2>${findings}</div>` : ''}

  ${summary.your_diagnosis ? `<div class="card"><h2>🩺 Your Diagnosis</h2><p style="font-size:15px;color:#334155;">${summary.your_diagnosis}</p></div>` : ''}

  ${medications ? `<div class="card"><h2>💊 Your Medications</h2>${medications}</div>` : ''}

  ${todos ? `<div class="card"><h2>✅ Things To Do</h2>${todos}</div>` : ''}

  ${dietHTML ? `<div class="card"><h2>🥗 Diet Recommendations</h2>${dietHTML}</div>` : ''}

  ${lifestyle ? `<div class="card"><h2>🏃 Lifestyle Changes</h2><ul style="padding-left:18px;margin:0;">${lifestyle}</ul></div>` : ''}

  ${warnings ? `<div class="card" style="border:1px solid #fee2e2;"><h2>⚠️ Warning Signs — When To Get Help</h2>${warnings}</div>` : ''}

  ${summary.recovery_timeline ? `<div class="card"><h2>📅 Recovery Timeline</h2><p style="color:#334155;">${summary.recovery_timeline}</p></div>` : ''}

  ${summary.next_appointment ? `<div class="card"><h2>📆 Next Appointment</h2><p style="color:#334155;">${summary.next_appointment}</p></div>` : ''}

  ${summary.encouraging_note ? `<div class="card" style="background:linear-gradient(135deg,rgba(31,159,163,0.05),rgba(31,159,163,0.02));text-align:center;"><p style="font-size:16px;color:#0B3C3D;font-weight:600;">${summary.encouraging_note}</p></div>` : ''}

  <div class="footer">
    <p>Generated by Diagnostic-IQ Smart EMR | Questions? Contact your doctor's office.</p>
    <p>This summary is for informational purposes. Always follow your doctor's advice.</p>
  </div>
</div></body></html>`;
}

module.exports = { generateDoctorPDF, generatePatientPDF };
