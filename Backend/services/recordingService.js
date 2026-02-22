const ffmpeg = require('fluent-ffmpeg');
const fs = require('node:fs').promises;
const path = require('node:path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const azureBlobService = require('./azureBlobService');

class RecordingService {
    constructor() {
        this.tempDir = path.join(__dirname, '../temp');
        this.ffmpegAvailable = null; // lazy check
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
     * Check if ffmpeg is available on the system
     */
    async checkFfmpeg() {
        if (this.ffmpegAvailable !== null) return this.ffmpegAvailable;
        return new Promise((resolve) => {
            require('child_process').exec('ffmpeg -version', (err) => {
                this.ffmpegAvailable = !err;
                if (!this.ffmpegAvailable) {
                    console.warn('⚠️ ffmpeg not found — recordings will be uploaded in original format without MP3 conversion');
                }
                resolve(this.ffmpegAvailable);
            });
        });
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

            let uploadBuffer = fileBuffer;
            let uploadFilename;
            let uploadContentType;
            let outputFormat;

            const hasFfmpeg = await this.checkFfmpeg();

            if (hasFfmpeg) {
                // Convert to MP3
                console.log('Converting to MP3...');
                uploadBuffer = await this.convertToMp3(fileBuffer, filename);
                uploadFilename = `recording-${metadata.appointmentId || uuidv4()}-${Date.now()}.mp3`;
                uploadContentType = 'audio/mpeg';
                outputFormat = 'mp3';
            } else {
                // Upload original format directly (skip ffmpeg conversion)
                const ext = path.extname(filename).toLowerCase() || '.webm';
                uploadFilename = `recording-${metadata.appointmentId || uuidv4()}-${Date.now()}${ext}`;
                const mimeMap = { '.webm': 'audio/webm', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg' };
                uploadContentType = mimeMap[ext] || 'audio/webm';
                outputFormat = ext.replace('.', '');
                console.log(`Uploading original ${outputFormat} format (ffmpeg not available for conversion)`);
            }

            // Upload to Azure Blob Storage
            console.log('Uploading to Azure Blob Storage...');
            const uploadResult = await azureBlobService.uploadFile(
                uploadBuffer,
                uploadFilename,
                uploadContentType
            );

            return {
                success: true,
                recordingUrl: uploadResult.sasUrl,
                blobName: uploadResult.blobName,
                size: uploadResult.size,
                format: outputFormat,
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
