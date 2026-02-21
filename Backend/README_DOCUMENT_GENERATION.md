# Clinical Consultation Document Generator - Node.js

This is a Node.js implementation of a clinical consultation document generator that creates professional Word documents from transcript and entity extraction JSON data.

## Features

- ✅ Generates professional Word documents (.docx)
- ✅ Converts clinical consultation transcripts into formatted reports
- ✅ Includes all section builders:
  - Session Overview (stats)
  - Presenting Symptoms
  - Vitals
  - Family History
  - Social History
  - Medications & Allergies
  - Full Transcript
  - Disclaimer & Sign-off

## Installation

```bash
npm install docx
```

## Usage

### 1. CLI Usage

```bash
node scripts/generateConsultationDoc.js <transcript.json> <extraction.json> <output.docx>
```

Example:
```bash
node scripts/generateConsultationDoc.js samples/transcript.json samples/extraction.json consultation_report.docx
```

### 2. API Usage (Express.js)

#### Register the routes in your main server file:

```javascript
const documentRoutes = require('./routes/documentRoutes');
app.use('/api', documentRoutes);
```

#### Make a POST request:

```bash
POST /api/generate-document
Content-Type: application/json

{
  "consultation_id": "CONS-2026-001",
  "transcript_json": { ... },
  "extraction_json": { ... }
}
```

Response: Downloads a Word document file

#### Alternative buffer endpoint:

```bash
POST /api/generate-document-buffer
```

Returns the document as base64 encoded string in JSON.

### 3. Programmatic Usage

```javascript
const { Packer } = require('docx');
const { generateConsultationDoc } = require('./services/documentGenerationService');
const fs = require('fs');

const transcriptJson = require('./samples/transcript.json');
const extractionJson = require('./samples/extraction.json');

const doc = generateConsultationDoc(transcriptJson, extractionJson);

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('output.docx', buffer);
  console.log('Document created successfully!');
});
```

## JSON Schema

### Transcript JSON

```json
{
  "transcript": {
    "turns": [
      {
        "speaker": "CLINICIAN" | "PATIENT",
        "text": "string",
        "start_time": number,
        "end_time": number,
        "confidence": number
      }
    ]
  },
  "audio_duration_seconds": number
}
```

### Extraction JSON

```json
{
  "entities": {
    "symptoms": [
      {
        "description": "string",
        "onset": "string",
        "duration": "string",
        "location": "string",
        "character": "string",
        "severity": "string"
      }
    ],
    "vitals": [
      {
        "name": "string",
        "value": "string",
        "notes": "string"
      }
    ],
    "medications": [
      {
        "name": "string",
        "dosage": "string",
        "frequency": "string",
        "indication": "string"
      }
    ],
    "allergies": [
      {
        "substance": "string",
        "reaction": "string",
        "severity": "string"
      }
    ],
    "family_history": [
      {
        "condition": "string",
        "relation": "string",
        "date_or_duration": "string"
      }
    ],
    "social_history": {
      "smoking": "string",
      "alcohol": "string",
      "occupation": "string",
      "exercise": "string",
      "cannabis": "string",
      "diet": "string"
    }
  }
}
```

## File Structure

```
Backend/
├── services/
│   └── documentGenerationService.js   # Core document generation logic
├── controllers/
│   └── documentController.js          # Express.js controller
├── routes/
│   └── documentRoutes.js             # API routes
├── scripts/
│   └── generateConsultationDoc.js    # CLI tool
└── samples/
    ├── transcript.json               # Sample transcript
    └── extraction.json               # Sample entity extraction
```

## Color Scheme

The document uses professional medical color coding:
- **Primary Blue** (#1A3C5E): Headers, clinician labels
- **Alert Red** (#C0392B): Symptoms section
- **Purple** (#6C3483): Family history
- **Teal** (#1A5276): Social history
- **Green** (#117A65): Medications
- **Orange** (#E67E22): Status warnings

## Dependencies

- `docx` - Document generation library

## Notes

- All fields support `null` or empty values (displayed as "N/A")
- Documents include confidence scores from transcription
- Auto-generates timestamp and metadata
- Includes AI-generation disclaimer
- Supports emojis in speaker labels (🩺 🧑)

## License

This code is provided for medical consultation documentation purposes.
