const supabase = require('./supabaseService');
const azureBlobService = require('./azureBlobService');

/**
 * Upload a document (file goes to Azure Blob, metadata to DB).
 */
const upload = async ({ file, patient_id, doctor_id, consultation_id, document_type, notes }) => {
  // Upload to Azure Blob
  const blobName = `docs/${patient_id}/${Date.now()}-${file.originalname}`;
  const blobUrl  = await azureBlobService.uploadBuffer(file.buffer, blobName, file.mimetype);

  // Save metadata in DB
  const { data, error } = await supabase.supabase
    .from('documents')
    .insert([{
      patient_id,
      doctor_id:        doctor_id || null,
      consultation_id:  consultation_id || null,
      document_name:    file.originalname,
      document_type:    document_type || 'other',
      file_url:         blobUrl || blobName,
      file_size_kb:     Math.round(file.size / 1024),
      mime_type:        file.mimetype,
      uploaded_by:      doctor_id || null,
      notes:            notes || null,
    }])
    .select()
    .single();

  if (error) throw error;

  await supabase.createAuditLog({
    actor_id:    doctor_id,
    actor_type:  'doctor',
    action:      'document_uploaded',
    entity_type: 'document',
    entity_id:   data.document_id,
    new_value:   { document_name: file.originalname, document_type },
  });

  return data;
};

/**
 * Get documents for a patient.
 */
const getByPatient = async (patientId) => {
  const { data, error } = await supabase.supabase
    .from('documents')
    .select('*')
    .eq('patient_id', patientId)
    .order('uploaded_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Generate a download URL for a document.
 */
const getDownloadUrl = async (documentId) => {
  const { data: doc, error } = await supabase.supabase
    .from('documents')
    .select('file_url, document_name')
    .eq('document_id', documentId)
    .single();

  if (error) throw error;

  // Generate SAS URL from Azure
  const sasUrl = await azureBlobService.generateSasUrl(doc.file_url, 24);
  return { url: sasUrl, name: doc.document_name };
};

module.exports = { upload, getByPatient, getDownloadUrl };
