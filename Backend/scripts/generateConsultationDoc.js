#!/usr/bin/env node

/**
 * CLI Tool for Clinical Consultation Document Generation
 * Usage: node generateConsultationDoc.js <transcript.json> <extraction.json> <output.docx>
 */

const { Packer } = require('docx');
const fs = require('fs');
const path = require('path');
const { generateConsultationDoc } = require('../services/documentGenerationService');

async function main() {
  const args = process.argv.slice(2);
  
  const transcriptPath = args[0] || 'transcript.json';
  const extractionPath = args[1] || 'extraction.json';
  const outputPath = args[2] || 'consultation_report.docx';

  try {
    // Read input files
    console.log(`📖 Reading transcript from: ${transcriptPath}`);
    const transcriptJson = JSON.parse(fs.readFileSync(transcriptPath, 'utf-8'));

    console.log(`📖 Reading extraction data from: ${extractionPath}`);
    const extractionJson = JSON.parse(fs.readFileSync(extractionPath, 'utf-8'));

    // Generate document
    console.log('🔨 Generating consultation document...');
    const doc = generateConsultationDoc(transcriptJson, extractionJson, outputPath);

    // Save to file
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);

    console.log(`✅ Document saved: ${path.resolve(outputPath)}`);
    console.log(`📄 File size: ${(buffer.length / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('❌ Error generating document:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
