const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security and middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Crisis categories
const VALID_CATEGORIES = ['Emergency', 'Medical', 'Resource', 'Safe', 'General'];

// Function to classify crisis message
async function classifyCrisisMessage(message) {
  try {
    // Minimal prompt to reduce token usage
    const prompt = `Classify this crisis message into ONE category: Emergency, Medical, Resource, Safe, General. Response format: just the category name only.\n\nMessage: "${message}"`;
    
    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 10,
        temperature: 0.1,
      },
    });
    
    const response = await result.response;
    const text = response.text().trim();
    
    // Validate the response
    const category = VALID_CATEGORIES.find(cat => 
      text.toLowerCase().includes(cat.toLowerCase())
    );
    
    return category || 'General';
    
  } catch (error) {
    console.error('Gemini classification error:', error.message.substring(0, 100));
    
    // Smart fallback classification using keyword matching
    return classifyWithFallback(message);
  }
}

// Smart fallback classification function
function classifyWithFallback(message) {
  const text = message.toLowerCase();
  
  // Emergency keywords
  const emergencyKeywords = [
    'emergency', 'urgent', 'help', 'trapped', 'fire', 'explosion', 'collapsed', 
    'earthquake', 'flood', 'hurricane', 'tornado', 'attack', 'violence',
    'danger', 'rescue', 'stuck', 'falling', 'burning', 'drowning', 'accident',
    'crash', 'collision', 'gunshot', 'shooting', 'bomb', 'gas leak'
  ];
  
  // Medical keywords  
  const medicalKeywords = [
    'medical', 'hospital', 'doctor', 'nurse', 'ambulance', 'injured', 'hurt',
    'bleeding', 'pain', 'sick', 'medicine', 'pills', 'surgery', 'broken',
    'fracture', 'wound', 'infection', 'fever', 'unconscious', 'breathing',
    'heart attack', 'stroke', 'allergic', 'diabetic', 'seizure', 'overdose'
  ];
  
  // Resource keywords
  const resourceKeywords = [
    'food', 'water', 'shelter', 'clothing', 'supplies', 'need', 'looking for',
    'hungry', 'thirsty', 'homeless', 'cold', 'warm', 'blanket', 'tent',
    'relief', 'aid', 'assistance', 'donation', 'volunteer', 'resources',
    'electricity', 'power', 'fuel', 'transportation', 'phone', 'communication'
  ];
  
  // Safety keywords
  const safetyKeywords = [
    'safe', 'okay', 'fine', 'secure', 'protected', 'shelter', 'evacuated',
    'rescued', 'all clear', 'no injuries', 'no damage', 'stable', 'recovered',
    'unharmed', 'intact', 'operational', 'functioning', 'normal'
  ];
  
  // Count keyword matches for each category
  const scores = {
    Emergency: emergencyKeywords.reduce((count, keyword) => 
      count + (text.includes(keyword) ? 1 : 0), 0),
    Medical: medicalKeywords.reduce((count, keyword) => 
      count + (text.includes(keyword) ? 1 : 0), 0),
    Resource: resourceKeywords.reduce((count, keyword) => 
      count + (text.includes(keyword) ? 1 : 0), 0),
    Safe: safetyKeywords.reduce((count, keyword) => 
      count + (text.includes(keyword) ? 1 : 0), 0)
  };
  
  // Find category with highest score
  const maxScore = Math.max(...Object.values(scores));
  const bestCategory = Object.keys(scores).find(cat => scores[cat] === maxScore);
  
  // Return best category if there's a clear winner, otherwise General
  return maxScore > 0 ? bestCategory : 'General';
}

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Crisis Mapping API Server',
    version: '1.0.0',
    endpoints: ['/api/classify'],
    status: 'operational'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Crisis message classification endpoint
app.post('/api/classify', async (req, res) => {
  try {
    const { message } = req.body;
    
    // Input validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Message is required and must be a non-empty string',
        category: 'General'
      });
    }
    
    if (message.length > 500) {
      return res.status(400).json({
        error: 'Message too long (max 500 characters)',
        category: 'General'
      });
    }
    
    // Classify the message
    const category = await classifyCrisisMessage(message.trim());
    
    res.json({ category });
    
  } catch (error) {
    console.error('Classification endpoint error:', error);
    res.status(500).json({
      error: 'Classification service temporarily unavailable',
      category: 'General'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    category: 'General'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    available_endpoints: ['GET /', 'GET /health', 'POST /api/classify']
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Crisis Mapping Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 Classification API: http://localhost:${PORT}/api/classify`);
  console.log(`🔑 Gemini API Key: ${process.env.GEMINI_API_KEY ? 'Configured ✅' : 'Missing ❌'}`);
});

module.exports = app;