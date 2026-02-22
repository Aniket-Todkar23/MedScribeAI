const { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = require('@azure/storage-blob');
const config = require('../config/config');
const { v4: uuidv4 } = require('uuid');

class AzureBlobService {
    constructor() {
        this.connectionString = config.azure.connectionString;
        this.containerName = config.azure.containerName;
        this.blobServiceClient = BlobServiceClient.fromConnectionString(this.connectionString);
        this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    }

    /**
     * Initialize container if it doesn't exist
     */
    async initializeContainer() {
        try {
            const exists = await this.containerClient.exists();
            if (!exists) {
                // Create private container (no public access)
                // Omitting 'access' parameter makes it private by default
                await this.containerClient.create();
                console.log(`Container "${this.containerName}" created successfully (private access)`);
            }
        } catch (error) {
            console.error('Error initializing container:', error.message);
            throw error;
        }
    }

    /**
     * Upload file buffer to Azure Blob Storage
     * @param {Buffer} fileBuffer - File buffer to upload
     * @param {string} fileName - Original file name
     * @param {string} contentType - MIME type of the file
     * @returns {Promise<Object>} Upload result with blob URL and SAS token
     */
    async uploadFile(fileBuffer, fileName, contentType = 'audio/mpeg') {
        try {
            // Ensure container exists before uploading
            await this.initializeContainer();

            // Generate unique blob name
            const blobName = `${uuidv4()}-${fileName}`;
            const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

            // Upload file
            await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
                blobHTTPHeaders: {
                    blobContentType: contentType
                }
            });

            console.log(`File uploaded successfully: ${blobName}`);

            // Generate SAS URL for secure access
            const sasUrl = await this.generateSasUrl(blobName);

            return {
                success: true,
                blobName: blobName,
                blobUrl: blockBlobClient.url,
                sasUrl: sasUrl,
                uploadedAt: new Date().toISOString(),
                size: fileBuffer.length
            };
        } catch (error) {
            console.error('Error uploading file to Azure Blob:', error.message);
            throw error;
        }
    }

    /**
     * Generate SAS URL with read permissions for secure access
     * @param {string} blobName - Name of the blob
     * @param {number} expiryHours - Hours until expiry (default: 24)
     * @returns {Promise<string>} SAS URL
     */
    async generateSasUrl(blobName, expiryHours = 24) {
        try {
            const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

            // Extract account name and key from connection string
            const accountName = this.extractAccountName(this.connectionString);
            const accountKey = this.extractAccountKey(this.connectionString);

            const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

            // Set SAS token expiry time
            const startsOn = new Date();
            const expiresOn = new Date(startsOn);
            expiresOn.setHours(startsOn.getHours() + expiryHours);

            // Generate SAS token
            const sasToken = generateBlobSASQueryParameters(
                {
                    containerName: this.containerName,
                    blobName: blobName,
                    permissions: BlobSASPermissions.parse('r'), // Read-only permission
                    startsOn: startsOn,
                    expiresOn: expiresOn
                },
                sharedKeyCredential
            ).toString();

            return `${blockBlobClient.url}?${sasToken}`;
        } catch (error) {
            console.error('Error generating SAS URL:', error.message);
            throw error;
        }
    }

    /**
     * Delete a blob from storage
     * @param {string} blobName - Name of the blob to delete
     */
    async deleteFile(blobName) {
        try {
            const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
            await blockBlobClient.delete();
            console.log(`File deleted successfully: ${blobName}`);
            return { success: true, message: 'File deleted successfully' };
        } catch (error) {
            console.error('Error deleting file from Azure Blob:', error.message);
            throw error;
        }
    }

    /**
     * Get file metadata
     * @param {string} blobName - Name of the blob
     */
    async getFileMetadata(blobName) {
        try {
            const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
            const properties = await blockBlobClient.getProperties();
            
            return {
                contentType: properties.contentType,
                contentLength: properties.contentLength,
                lastModified: properties.lastModified,
                metadata: properties.metadata
            };
        } catch (error) {
            console.error('Error getting file metadata:', error.message);
            throw error;
        }
    }

    /**
     * Extract account name from connection string
     */
    extractAccountName(connectionString) {
        const match = connectionString.match(/AccountName=([^;]+)/);
        return match ? match[1] : null;
    }

    /**
     * Extract account key from connection string
     */
    extractAccountKey(connectionString) {
        const match = connectionString.match(/AccountKey=([^;]+)/);
        return match ? match[1] : null;
    }

    /**
     * List all files in container (admin use)
     */
    async listFiles(prefix = '') {
        try {
            const files = [];
            for await (const blob of this.containerClient.listBlobsFlat({ prefix })) {
                files.push({
                    name: blob.name,
                    size: blob.properties.contentLength,
                    contentType: blob.properties.contentType,
                    lastModified: blob.properties.lastModified
                });
            }
            return files;
        } catch (error) {
            console.error('Error listing files:', error.message);
            throw error;
        }
    }
}

module.exports = new AzureBlobService();
