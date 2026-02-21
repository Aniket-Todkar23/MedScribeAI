/**
 * ========================================================================
 * CLINICAL CONSULTATION DOCUMENT GENERATOR - USAGE GUIDE
 * ========================================================================
 * 
 * A complete Node.js implementation for generating professional Word 
 * documents from clinical consultation transcripts.
 */

/* ─────────────────────────────────────────────────────────────────────
   1️⃣  QUICK START - CLI Usage
   ───────────────────────────────────────────────────────────────────── */

// Generate a document from JSON files:
// $ node scripts/generateConsultationDoc.js transcript.json extraction.json output.docx

// Example with sample data:
// $ node scripts/generateConsultationDoc.js samples/transcript.json samples/extraction.json report.docx


/* ─────────────────────────────────────────────────────────────────────
   2️⃣  PROGRAMMATIC USAGE - In Your Code
   ───────────────────────────────────────────────────────────────────── */

const { Packer } = require('docx');
const { generateConsultationDoc } = require('./services/documentGenerationService');
const fs = require('fs');

// Your data
const transcriptData = {
  transcript: {
    turns: [
      {
        speaker: "CLINICIAN",
        text: "Hello, how can I help you today?",
        start_time: 0,
        end_time: 2.5,
        confidence: 0.98
      },
      {
        speaker: "PATIENT", 
        text: "I have a headache for the past week.",
        start_time: 3.0,
        end_time: 6.0,
        confidence: 0.95
      }
    ]
  },
  audio_duration_seconds: 120
};

const extractionData = {
  entities: {
    symptoms: [
      {
        description: "Headache",
        onset: "1 week ago",
        duration: "7 days",
        location: "Frontal region",
        character: "Throbbing",
        severity: "6/10"
      }
    ],
    vitals: [
      {
        name: "Blood Pressure",
        value: "120/80 mmHg",
        notes: "Normal"
      }
    ],
    medications: [
      { name: "Ibuprofen", dosage: "400mg", frequency: "PRN" }
    ],
    allergies: [
      { substance: "Penicillin", reaction: "Rash", severity: "Moderate" }
    ]
  }
};

// Generate and save
async function generateMyDocument() {
  const doc = generateConsultationDoc(transcriptData, extractionData);
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('my_consultation.docx', buffer);
  console.log('✅ Document created!');
}

// generateMyDocument();


/* ─────────────────────────────────────────────────────────────────────
   3️⃣  API USAGE - Express.js Endpoints
   ───────────────────────────────────────────────────────────────────── */

// The server exposes two endpoints:

/** 
 * POST /api/documents/generate-document
 * 
 * Returns the document as a downloadable file
 * 
 * Request Body:
 * {
 *   "consultation_id": "CONS-2026-001",
 *   "transcript_json": { ... },
 *   "extraction_json": { ... }
 * }
 * 
 * Response: application/vnd.openxmlformats-officedocument.wordprocessingml.document
 */

/** 
 * POST /api/documents/generate-document-buffer
 * 
 * Returns the document as base64 string in JSON
 * 
 * Response:
 * {
 *   "success": true,
 *   "consultation_id": "CONS-2026-001",
 *   "filename": "consultation_CONS-2026-001.docx",
 *   "document": "base64_encoded_data...",
 *   "size_kb": "9.79"
 * }
 */


/* ─────────────────────────────────────────────────────────────────────
   4️⃣  TESTING THE API
   ───────────────────────────────────────────────────────────────────── */

// Start the server first:
// $ npm start

// Then test the API:
// $ node scripts/testDocumentAPI.js --test

// Or use curl:
/*
curl -X POST http://localhost:3000/api/documents/generate-document \
     -H "Content-Type: application/json" \
     -d '{
       "consultation_id": "TEST-001",
       "transcript_json": {...},
       "extraction_json": {...}
     }' \
     --output consultation.docx
*/


/* ─────────────────────────────────────────────────────────────────────
   5️⃣  JAVASCRIPT FETCH EXAMPLE (Frontend)
   ───────────────────────────────────────────────────────────────────── */

async function downloadConsultationDocument(consultationId, transcriptJson, extractionJson) {
  try {
    const response = await fetch('http://localhost:3000/api/documents/generate-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        consultation_id: consultationId,
        transcript_json: transcriptJson,
        extraction_json: extractionJson
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate document');
    }

    // Download the file
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consultation_${consultationId}.docx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    console.log('✅ Document downloaded successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Usage:
// downloadConsultationDocument('CONS-123', transcriptData, extractionData);


/* ─────────────────────────────────────────────────────────────────────
   6️⃣  AXIOS EXAMPLE (Node.js or Frontend)
   ───────────────────────────────────────────────────────────────────── */

const axios = require('axios');

async function generateDocumentWithAxios() {
  try {
    const response = await axios.post(
      'http://localhost:3000/api/documents/generate-document',
      {
        consultation_id: 'CONS-123',
        transcript_json: transcriptData,
        extraction_json: extractionData
      },
      {
        responseType: 'arraybuffer' // Important for binary data
      }
    );

    // Save to file
    fs.writeFileSync('consultation.docx', response.data);
    console.log('✅ Document saved!');
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}


/* ─────────────────────────────────────────────────────────────────────
   7️⃣  REACT EXAMPLE
   ───────────────────────────────────────────────────────────────────── */

/*
import React, { useState } from 'react';

function ConsultationDocGenerator() {
  const [loading, setLoading] = useState(false);

  const handleGenerateDocument = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/documents/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultation_id: 'CONS-123',
          transcript_json: yourTranscriptData,
          extraction_json: yourExtractionData
        })
      });

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'consultation_report.docx';
      link.click();
      
      alert('Document downloaded successfully!');
    } catch (error) {
      alert('Failed to generate document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleGenerateDocument} disabled={loading}>
      {loading ? 'Generating...' : 'Download Consultation Report'}
    </button>
  );
}
*/


/* ─────────────────────────────────────────────────────────────────────
   8️⃣  JSON SCHEMA REFERENCE
   ───────────────────────────────────────────────────────────────────── */

const SCHEMA_EXAMPLE = {
  // Transcript JSON structure
  transcript_json: {
    transcript: {
      turns: [
        {
          speaker: "CLINICIAN" | "PATIENT",  // Required
          text: "string",                     // Required
          start_time: 0.0,                    // Seconds (required)
          end_time: 5.5,                      // Seconds (required)
          confidence: 0.95                    // 0-1 (required)
        }
      ]
    },
    audio_duration_seconds: 120  // Total duration
  },

  // Extraction JSON structure
  extraction_json: {
    entities: {
      symptoms: [
        {
          description: "string",
          onset: "string",
          duration: "string",
          location: "string",
          character: "string",
          severity: "string"
        }
      ],
      vitals: [
        { name: "string", value: "string", notes: "string" }
      ],
      medications: [
        { name: "string", dosage: "string", frequency: "string", indication: "string" }
      ],
      allergies: [
        { substance: "string", reaction: "string", severity: "string" }
      ],
      family_history: [
        { condition: "string", relation: "string", date_or_duration: "string" }
      ],
      social_history: {
        smoking: "string",
        alcohol: "string",
        occupation: "string",
        exercise: "string",
        cannabis: "string",
        diet: "string"
      }
    }
  }
};


/* ─────────────────────────────────────────────────────────────────────
   9️⃣  ERROR HANDLING
   ───────────────────────────────────────────────────────────────────── */

// The API returns appropriate HTTP status codes:
// - 200: Success - document generated
// - 400: Bad Request - invalid input data
// - 500: Server Error - failed to generate document

// Example error handling:
async function generateWithErrorHandling() {
  try {
    const response = await fetch('/api/documents/generate-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consultation_id: 'TEST',
        transcript_json: transcriptData,
        extraction_json: extractionData
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API Error:', error);
      return;
    }

    // Success
    const blob = await response.blob();
    // ... handle download
  } catch (error) {
    console.error('Network Error:', error);
  }
}


/* ─────────────────────────────────────────────────────────────────────
   🔟  CUSTOMIZATION TIPS
   ───────────────────────────────────────────────────────────────────── */

// To customize the document appearance, edit:
// - services/documentGenerationService.js

// Color scheme can be customized in the section builders:
// - createSectionHeader(text, colorHex)
// - createCellShading(hexColor)

// Font sizes (in half-points):
// - Title: 32 (16pt)
// - Headers: 26 (13pt)
// - Body: 20 (10pt)
// - Small: 18 (9pt)

// To add new sections, create a builder function following the pattern:
/*
function buildNewSection(entities) {
  const data = entities.new_section || [];
  if (!data.length) return [];
  
  return [
    createSectionHeader('My New Section', 'FF5733'),
    // ... add content ...
    new Paragraph({ text: '' })
  ];
}
*/


/* ─────────────────────────────────────────────────────────────────────
   📚 ADDITIONAL RESOURCES
   ───────────────────────────────────────────────────────────────────── */

// Documentation files:
// - README_DOCUMENT_GENERATION.md    : Full documentation
// - samples/                         : Sample input JSONs
// - examples/                        : Usage examples

// Test files:
// $ node scripts/testDocumentAPI.js --curl     # Show CURL examples
// $ node examples/documentGenerationExamples.js # Generate test docs

module.exports = {
  // Export functions for use in other files
  generateMyDocument,
  downloadConsultationDocument,
  generateDocumentWithAxios,
  SCHEMA_EXAMPLE
};
