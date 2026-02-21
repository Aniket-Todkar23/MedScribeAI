import axios from 'axios';

const API_BASE =
  (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_API_URL ?? 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ---------- Types ---------- */

export interface DocumentMeta {
  document_id: string;
  patient_id: string;
  doctor_id: string;
  consultation_id: string | null;
  document_name: string;
  document_type: string;
  file_url: string;
  blob_path: string;
  file_size_kb: number;
  mime_type: string;
  notes: string | null;
  uploaded_at: string;
}

/* ---------- API calls ---------- */

export const documentService = {
  upload: (file: File, meta: { patient_id: string; document_type?: string; consultation_id?: string; notes?: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(meta).forEach(([k, v]) => {
      if (v !== undefined) formData.append(k, v);
    });
    return api.post<{ document: DocumentMeta }>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.document);
  },

  getByPatient: (patientId: string) =>
    api.get<{ documents: DocumentMeta[] }>(`/documents/patient/${patientId}`)
      .then((r) => r.data.documents),

  getDownloadUrl: (documentId: string) =>
    api.get<{ url: string }>(`/documents/${documentId}/download`)
      .then((r) => r.data.url),
};
