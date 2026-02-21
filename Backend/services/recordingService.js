const ffmpeg = require('fluent-ffmpeg');
const fs = require('node:fs').promises;
const path = require('node:path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const azureBlobService = require('./azureBlobService');

class RecordingService {
    constructor() {
        this.tempDir = path.join(__dirname, '../temp');
        this.ensureTempDir();
    }

    /**
     * Ensure temp directory exists
     */
    async ensureTempDir() {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (error) {
            console.error('Error creating temp directory:', error.message);
        }
    }

    /**
     * Convert recording to MP3 format
     * @param {Buffer} fileBuffer - Original file buffer
     * @param {string} originalFilename - Original filename
     * @returns {Promise<Buffer>} MP3 file buffer
     */
    async convertToMp3(fileBuffer, originalFilename) {
        const inputPath = path.join(this.tempDir, `input-${uuidv4()}${path.extname(originalFilename)}`);
        const outputPath = path.join(this.tempDir, `output-${uuidv4()}.mp3`);

        try {
            // Write input file to temp
            await fs.writeFile(inputPath, fileBuffer);

            // Convert to MP3 using ffmpeg
            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .toFormat('mp3')
                    .audioBitrate(config.recording.bitrate)
                    .audioChannels(2)
                    .audioFrequency(44100)
                    .on('end', () => {
                        console.log('Conversion to MP3 completed');
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error('Error during conversion:', err.message);
                        reject(err);
                    })
                    .save(outputPath);
            });

            // Read converted file
            const mp3Buffer = await fs.readFile(outputPath);

            // Cleanup temp files
            await this.cleanupTempFiles([inputPath, outputPath]);

            return mp3Buffer;
        } catch (error) {
            // Cleanup on error
            await this.cleanupTempFiles([inputPath, outputPath]);
            console.error('Error converting to MP3:', error.message);
            throw error;
        }
    }

    /**
     * Process and upload recording
     * @param {Buffer} fileBuffer - Recording file buffer
     * @param {string} filename - Original filename
     * @param {Object} metadata - Recording metadata (appointmentId, consultationId, etc.)
     * @returns {Promise<Object>} Upload result with SAS URL
     */
    async processAndUploadRecording(fileBuffer, filename, metadata) {
        try {
            console.log('Starting recording processing...');

            // Check file size
            const fileSizeMB = fileBuffer.length / (1024 * 1024);
            if (fileSizeMB > config.recording.maxFileSizeMB) {
                throw new Error(`File size ${fileSizeMB.toFixed(2)}MB exceeds maximum allowed ${config.recording.maxFileSizeMB}MB`);
            }

            // Convert to MP3
            console.log('Converting to MP3...');
            const mp3Buffer = await this.convertToMp3(fileBuffer, filename);

            // Generate MP3 filename
            const mp3Filename = `recording-${metadata.appointmentId || uuidv4()}-${Date.now()}.mp3`;

            // Upload to Azure Blob Storage
            console.log('Uploading to Azure Blob Storage...');
            const uploadResult = await azureBlobService.uploadFile(
                mp3Buffer,
                mp3Filename,
                'audio/mpeg'
            );

            return {
                success: true,
                recordingUrl: uploadResult.sasUrl,
                blobName: uploadResult.blobName,
                size: uploadResult.size,
                format: 'mp3',
                uploadedAt: uploadResult.uploadedAt,
                metadata: metadata
            };
        } catch (error) {
            console.error('Error processing and uploading recording:', error.message);
            throw error;
        }
    }

    /**
     * Cleanup temporary files
     * @param {Array<string>} filePaths - Array of file paths to delete
     */
    async cleanupTempFiles(filePaths) {
        for (const filePath of filePaths) {
            try {
                await fs.unlink(filePath);
            } catch (error) {
                // Ignore errors if file doesn't exist
                if (error.code !== 'ENOENT') {
                    console.error(`Error deleting temp file ${filePath}:`, error.message);
                }
            }
        }
    }

    /**
     * Get recording metadata
     * @param {string} blobName - Name of the blob in storage
     */
    async getRecordingMetadata(blobName) {
        try {
            return await azureBlobService.getFileMetadata(blobName);
        } catch (error) {
            console.error('Error getting recording metadata:', error.message);
            throw error;
        }
    }

    /**
     * Delete recording
     * @param {string} blobName - Name of the blob to delete
     */
    async deleteRecording(blobName) {
        try {
            return await azureBlobService.deleteFile(blobName);
        } catch (error) {
            console.error('Error deleting recording:', error.message);
            throw error;
        }
    }

    /**
     * Generate new SAS URL for existing recording
     * @param {string} blobName - Name of the blob
     * @param {number} expiryHours - Hours until expiry
     */
    async generateNewSasUrl(blobName, expiryHours = 24) {
        try {
            return await azureBlobService.generateSasUrl(blobName, expiryHours);
        } catch (error) {
            console.error('Error generating new SAS URL:', error.message);
            throw error;
        }
    }

    /**
     * Validate file format
     * @param {string} filename - Filename to validate
     * @returns {boolean} Whether format is supported
     */
    isValidFormat(filename) {
        const ext = path.extname(filename).toLowerCase().replace('.', '');
        return config.recording.supportedFormats.includes(ext);
    }
}

module.exports = new RecordingService();
