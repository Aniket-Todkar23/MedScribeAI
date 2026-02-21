require('dotenv').config();

module.exports = {
    // Azure Blob Storage Configuration
    azure: {
        connectionString: process.env.AZURE_CONNECTION_STRING || "DefaultEndpointsProtocol=https;AccountName=pasteroom6270;AccountKey=iD+bi57e4/T3i8IhVpCsD1Bhccrk5Zc0h06mwm7jb7iDoiepGXKp9Msu5x9v0RM3nOqCEeoTh2OH+ASt4qWFjA==;EndpointSuffix=core.windows.net",
        containerName: "recordings",
        sasTokenExpiryHours: 24 // SAS token validity for signed URLs
    },

    // Google Meet Configuration
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '281196883998-brdb6h03e0uhksr2go7fbfgm7nddu0i7.apps.googleusercontent.com',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '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',
        redirectUrl: process.env.GOOGLE_REDIRECT_URL || 'http://localhost:3000/api/appointments/google/oauth2callback',
        scopes: [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/drive.readonly' // For accessing Meet recordings
        ]
    },

    // Email Configuration
    email: {
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASS,
        from: process.env.EMAIL_FROM || `Smart EMR <${process.env.EMAIL_USER}>`
    },

    // Supabase Configuration
    supabase: {
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    },

    // Server Configuration
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development'
    },

    // Appointment Configuration
    appointment: {
        defaultDuration: 30, // minutes
        reminderBeforeHours: 24 // Send reminder 24 hours before appointment
    },

    // Recording Configuration
    recording: {
        maxFileSizeMB: 500,
        supportedFormats: ['webm', 'wav', 'mp4', 'ogg'],
        outputFormat: 'mp3',
        bitrate: '192k'
    }
};
