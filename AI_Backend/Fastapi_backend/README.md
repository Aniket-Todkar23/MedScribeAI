# Smart EMR FastAPI Backend

This is the FastAPI backend for the Smart EMR application. It provides endpoints for audio transcription, speaker diarization, clinical entity extraction, and EMR generation using the MedGemma 27B model hosted on Modal.

## Prerequisites

- Python 3.10+
- FFmpeg installed and available in your system PATH.
- A Modal account and token for the MedGemma 27B model.

## Installation

1.  **Clone the repository and navigate to the backend directory:**

    ```bash
    cd AI_Backend/Fastapi_backend
    ```

2.  **Create a virtual environment (recommended):**

    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3.  **Install dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up environment variables:**

    Create a `.env` file in the `AI_Backend/Fastapi_backend` directory with the following variables:

    ```env
    # Modal MedGemma Endpoint
    MODAL_MEDGEMMA_URL=https://your-modal-endpoint-url.modal.run/v1/chat/completions

    # Hugging Face Token (for Pyannote speaker diarization)
    HF_TOKEN=your_huggingface_token
    ```

## Running the Server

Start the FastAPI server using Uvicorn:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API documentation will be available at `http://localhost:8000/docs`.

## API Endpoints

### 1. Health Check
- **Endpoint:** `GET /health`
- **Description:** Checks if the API and its dependencies (like the Modal MedGemma server) are running.
- **Response:**
  ```json
  {
    "status": "ok",
    "medgemma_status": "ok"
  }
  ```

### 2. Transcribe Audio
- **Endpoint:** `POST /transcribe`
- **Description:** Transcribes an audio file and performs speaker diarization.
- **Request:** `multipart/form-data`
  - `file`: The audio file (e.g., .wav, .mp3).
- **Response:**
  ```json
  {
    "transcript": [
      {
        "speaker": "SPEAKER_00",
        "text": "Hello, how are you feeling today?",
        "start": 0.5,
        "end": 2.3
      },
      {
        "speaker": "SPEAKER_01",
        "text": "I have a slight headache.",
        "start": 2.5,
        "end": 4.0
      }
    ],
    "raw_text": "Hello, how are you feeling today? I have a slight headache.",
    "duration_seconds": 4.5
  }
  ```

### 3. Extract Clinical Entities
- **Endpoint:** `POST /extract`
- **Description:** Extracts structured clinical entities (symptoms, medications, etc.) from a transcript.
- **Request:** `application/json`
  ```json
  {
    "transcript": [
      {
        "speaker": "SPEAKER_00",
        "text": "Hello, how are you feeling today?",
        "start": 0.5,
        "end": 2.3
      },
      {
        "speaker": "SPEAKER_01",
        "text": "I have a slight headache.",
        "start": 2.5,
        "end": 4.0
      }
    ]
  }
  ```
- **Response:**
  ```json
  {
    "symptoms": [
      {
        "name": "headache",
        "severity": "slight",
        "status": "active"
      }
    ],
    "medications": [],
    "conditions": []
  }
  ```

### 4. Generate EMR
- **Endpoint:** `POST /generate-emr`
- **Description:** Generates a comprehensive, FHIR-aligned EMR record from the extracted entities and transcript.
- **Request:** `application/json`
  ```json
  {
    "entities": {
      "symptoms": [
        {
          "name": "headache",
          "severity": "slight",
          "status": "active"
        }
      ]
    },
    "transcript": [
      {
        "speaker": "SPEAKER_00",
        "text": "Hello, how are you feeling today?",
        "start": 0.5,
        "end": 2.3
      },
      {
        "speaker": "SPEAKER_01",
        "text": "I have a slight headache.",
        "start": 2.5,
        "end": 4.0
      }
    ],
    "encounter_type": "outpatient",
    "patient_name": "John Doe",
    "provider_name": "Dr. Smith",
    "facility_name": "General Hospital"
  }
  ```
- **Response:** Returns a full `EMRRecord` JSON object aligned with FHIR R4 standards, including PatientDemographics, EncounterInfo, ClinicalNarratives (SOAP), ReviewOfSystems, and structured clinical entities.

### 5. Generate Patient Summary
- **Endpoint:** `POST /generate-summary`
- **Description:** Generates a patient-friendly summary of the visit.
- **Request:** `application/json`
  ```json
  {
    "emr_data": { ... } // The EMRRecord object returned by /generate-emr
  }
  ```
- **Response:**
  ```json
  {
    "summary": "During your visit today, you reported a slight headache. Dr. Smith recommended rest and hydration."
  }
  ```