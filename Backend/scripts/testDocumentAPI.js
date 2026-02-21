/**
 * Test Script for Document Generation API
 * This demonstrates how to call the document generation endpoint
 */

const fs = require('fs');
const path = require('path');

// Sample data paths
const transcriptPath = path.join(__dirname, '../samples/transcript.json');
const extractionPath = path.join(__dirname, '../samples/extraction.json');

// Read the sample data
const transcriptJson = JSON.parse(fs.readFileSync(transcriptPath, 'utf-8'));
const extractionJson = JSON.parse(fs.readFileSync(extractionPath, 'utf-8'));

// API test payload
const testPayload = {
  consultation_id: 'TEST-2026-001',
  transcript_json: transcriptJson,
  extraction_json: extractionJson
};

console.log('📋 Test Payload for API:');
console.log('========================\n');
console.log('POST /api/documents/generate-document');
console.log('Content-Type: application/json\n');
console.log(JSON.stringify(testPayload, null, 2));
console.log('\n========================\n');

// Test with fetch (Node.js 18+) or axios
async function testAPI() {
  const API_URL = process.env.API_URL || 'http://localhost:3000';
  
  try {
    console.log(`🔍 Testing API at ${API_URL}/api/documents/generate-document...`);
    
    const response = await fetch(`${API_URL}/api/documents/generate-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    if (response.ok) {
      // Save the document
      const buffer = await response.arrayBuffer();
      const outputPath = path.join(__dirname, '../samples/api_test_output.docx');
      fs.writeFileSync(outputPath, Buffer.from(buffer));
      
      console.log('✅ API Test Successful!');
      console.log(`📄 Document saved to: ${outputPath}`);
      console.log(`📦 File size: ${(buffer.byteLength / 1024).toFixed(2)} KB`);
    } else {
      const error = await response.json();
      console.error('❌ API Error:', error);
    }
  } catch (error) {
    console.error('❌ Connection Error:', error.message);
    console.log('\n💡 Make sure the backend server is running on port 3000');
    console.log('   Run: npm start');
  }
}

// Test buffer endpoint
async function testBufferAPI() {
  const API_URL = process.env.API_URL || 'http://localhost:3000';
  
  try {
    console.log(`\n🔍 Testing Buffer API at ${API_URL}/api/documents/generate-document-buffer...`);
    
    const response = await fetch(`${API_URL}/api/documents/generate-document-buffer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Buffer API Test Successful!');
      console.log(`📄 Document ID: ${result.consultation_id}`);
      console.log(`📦 File size: ${result.size_kb} KB`);
      console.log(`🔐 Base64 length: ${result.document.length} chars`);
      
      // Optionally save the base64 to file
      const buffer = Buffer.from(result.document, 'base64');
      const outputPath = path.join(__dirname, '../samples/buffer_test_output.docx');
      fs.writeFileSync(outputPath, buffer);
      console.log(`💾 Saved decoded document to: ${outputPath}`);
    } else {
      const error = await response.json();
      console.error('❌ API Error:', error);
    }
  } catch (error) {
    console.error('❌ Connection Error:', error.message);
  }
}

// CURL examples
function showCurlExamples() {
  console.log('\n📝 CURL Examples:');
  console.log('=================\n');
  
  console.log('1. Download document directly:');
  console.log('   curl -X POST http://localhost:3000/api/documents/generate-document \\');
  console.log('        -H "Content-Type: application/json" \\');
  console.log('        -d @test_payload.json \\');
  console.log('        --output consultation.docx\n');
  
  console.log('2. Get document as base64:');
  console.log('   curl -X POST http://localhost:3000/api/documents/generate-document-buffer \\');
  console.log('        -H "Content-Type: application/json" \\');
  console.log('        -d @test_payload.json\n');
}

// Run tests if server is available
if (process.argv.includes('--test')) {
  testAPI().then(() => testBufferAPI());
} else if (process.argv.includes('--curl')) {
  showCurlExamples();
} else {
  console.log('\nUsage:');
  console.log('  node testDocumentAPI.js --test   # Run API tests');
  console.log('  node testDocumentAPI.js --curl   # Show CURL examples');
  console.log('\nOr use the payload above to test manually with Postman/Thunder Client');
}
