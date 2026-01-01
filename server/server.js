import express from 'express';
import dotenv from 'dotenv';
import connectDB from './db/connectDB.js';
import cookieParser from 'cookie-parser';
import userRoutes from './routes/userRoutes.js';
import postRoutes from './routes/postRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import { v2 as cloudinary } from 'cloudinary';
import { app, server } from './socket/socket.js';

dotenv.config();

connectDB();

const PORT = process.env.PORT || 5000;

// Configure Cloudinary with error handling
try {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  if (!cloudName || !apiKey || !apiSecret) {
    console.error('[ERROR] Cloudinary credentials missing in .env file. Image uploads will fail.');
    console.error('[ERROR] Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env file.');
  } else {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    console.log('[Cloudinary] ✅ Configuration loaded successfully');
    console.log(`[Cloudinary] Cloud Name: ${cloudName}`);
  }
} catch (err) {
  console.error('[Cloudinary] Configuration error:', err.message);
}

// Middlewares
app.use(express.json({ limit: '50mb' })); // To parse JSON data in the req.body
app.use(express.urlencoded({ extended: true })); // To parse form data in the req.body
app.use(cookieParser());

// Lightweight CORS middleware to allow local dev client access
app.use((req, res, next) => {
  // Allow local dev origins — update in production
  const origin = req.headers.origin;
  if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  }
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Simple request logger for debugging proxy issues
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/ai', aiRoutes);

// Test endpoint for Cloudinary
app.post('/api/test/cloudinary', async (req, res) => {
  try {
    // Test with a simple base64 image (1x1 transparent PNG)
    const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    const result = await cloudinary.uploader.upload(testImage, {
      folder: 'test',
      resource_type: 'image'
    });
    
    // Clean up - delete the test image
    await cloudinary.uploader.destroy(result.public_id);
    
    return res.json({ 
      success: true, 
      message: 'Cloudinary is working!',
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      hasApiKey: !!process.env.CLOUDINARY_API_KEY,
      hasApiSecret: !!process.env.CLOUDINARY_API_SECRET
    });
  } catch (error) {
    return res.status(500).json({ 
      error: 'Cloudinary test failed',
      message: error.message,
      details: error.toString(),
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      hasApiKey: !!process.env.CLOUDINARY_API_KEY,
      hasApiSecret: !!process.env.CLOUDINARY_API_SECRET
    });
  }
});

// Verify environment variables on startup
console.log('\n=== Environment Variables Check ===');
console.log(`PORT: ${PORT}`);
console.log(`MONGO_URI: ${process.env.MONGO_URI ? '✅ Set' : '❌ Missing'}`);
console.log(`CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing'}`);
console.log(`CLOUDINARY_API_KEY: ${process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`CLOUDINARY_API_SECRET: ${process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`GROQ_API_KEY: ${process.env.GROQ_API_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set (fallback)' : '❌ Not set'}`);
console.log(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ Set (fallback)' : '❌ Not set'}`);
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log('=====================================\n');

server.listen(PORT, () =>
  console.log(`✅ Server started at http://localhost:${PORT}`)
);
