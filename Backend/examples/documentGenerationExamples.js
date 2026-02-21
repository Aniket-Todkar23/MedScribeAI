/**
 * Quick Start Example - Clinical Document Generation
 */

const { Packer } = require('docx');
const { generateConsultationDoc } = require('../services/documentGenerationService');
const fs = require('fs');

// Example 1: Minimal transcript with basic data
const minimalExample = {
  transcript_json: {
    transcript: {
      turns: [
        {
          speaker: "CLINICIAN",
          text: "Hello, how are you feeling today?",
          start_time: 0,
          end_time: 2.5,
          confidence: 0.98
        },
        {
          speaker: "PATIENT",
          text: "I have been experiencing headaches for about a week.",
          start_time: 3.0,
          end_time: 6.5,
          confidence: 0.96
        }
      ]
    },
    audio_duration_seconds: 10
  },
  extraction_json: {
    entities: {
      symptoms: [
        {
          description: "Headaches",
          onset: "1 week ago",
          duration: "1 week",
          location: "Head",
          character: "Persistent",
          severity: "Moderate"
        }
      ]
    }
  }
};

// Example 2: Complete consultation with all sections
const completeExample = {
  transcript_json: {
    transcript: {
      turns: [
        {
          speaker: "CLINICIAN",
          text: "Good morning. What brings you in today?",
          start_time: 0,
          end_time: 2.8,
          confidence: 0.99
        },
        {
          speaker: "PATIENT",
          text: "I've had chest pain and shortness of breath.",
          start_time: 3.2,
          end_time: 6.5,
          confidence: 0.97
        },
        {
          speaker: "CLINICIAN",
          text: "When did this start? Can you describe the pain?",
          start_time: 7.0,
          end_time: 10.2,
          confidence: 0.98
        },
        {
          speaker: "PATIENT",
          text: "It started yesterday. It's a sharp pain in the center of my chest.",
          start_time: 10.8,
          end_time: 15.3,
          confidence: 0.95
        }
      ]
    },
    audio_duration_seconds: 120
  },
  extraction_json: {
    entities: {
      symptoms: [
        {
          description: "Chest pain",
          onset: "Yesterday",
          duration: "24 hours",
          location: "Center of chest",
          character: "Sharp",
          severity: "8/10"
        },
        {
          description: "Shortness of breath",
          onset: "Yesterday",
          duration: "24 hours",
          location: "Chest",
          character: "Progressive",
          severity: "Moderate"
        }
      ],
      vitals: [
        {
          name: "Blood Pressure",
          value: "145/92 mmHg",
          notes: "Elevated"
        },
        {
          name: "Heart Rate",
          value: "98 bpm",
          notes: "Slightly tachycardic"
        },
        {
          name: "SpO2",
          value: "96%",
          notes: "Normal on room air"
        }
      ],
      medications: [
        {
          name: "Aspirin",
          dosage: "81mg",
          frequency: "Daily",
          indication: "Cardiovascular prophylaxis"
        },
        {
          name: "Metformin",
          dosage: "500mg",
          frequency: "Twice daily",
          indication: "Type 2 Diabetes"
        }
      ],
      allergies: [
        {
          substance: "Sulfa drugs",
          reaction: "Severe rash",
          severity: "High"
        }
      ],
      family_history: [
        {
          condition: "Coronary artery disease",
          relation: "Father",
          date_or_duration: "Diagnosed at age 55"
        },
        {
          condition: "Hypertension",
          relation: "Mother",
          date_or_duration: "Chronic"
        }
      ],
      social_history: {
        smoking: "Former smoker, quit 5 years ago",
        alcohol: "Occasional, 1-2 drinks per week",
        occupation: "Office worker",
        exercise: "Walks 30 minutes 3x per week",
        cannabis: "Never used",
        diet: "Low sodium, diabetic diet"
      }
    }
  }
};

// Generate documents
async function generateExamples() {
  console.log('🔨 Generating example documents...\n');

  // Generate minimal example
  console.log('1️⃣  Creating minimal example...');
  const minimalDoc = generateConsultationDoc(
    minimalExample.transcript_json,
    minimalExample.extraction_json
  );
  const minimalBuffer = await Packer.toBuffer(minimalDoc);
  fs.writeFileSync('minimal_consultation.docx', minimalBuffer);
  console.log(`   ✅ Saved: minimal_consultation.docx (${(minimalBuffer.length / 1024).toFixed(2)} KB)\n`);

  // Generate complete example
  console.log('2️⃣  Creating complete example...');
  const completeDoc = generateConsultationDoc(
    completeExample.transcript_json,
    completeExample.extraction_json
  );
  const completeBuffer = await Packer.toBuffer(completeDoc);
  fs.writeFileSync('complete_consultation.docx', completeBuffer);
  console.log(`   ✅ Saved: complete_consultation.docx (${(completeBuffer.length / 1024).toFixed(2)} KB)\n`);

  console.log('✨ Done! Open the .docx files to see the results.\n');
}

// Run if executed directly
if (require.main === module) {
  generateExamples().catch(console.error);
}

module.exports = {
  minimalExample,
  completeExample,
  generateExamples
};
