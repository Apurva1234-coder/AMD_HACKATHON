/**
 * Simple test script to verify Gemini API integration
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const VALID_CATEGORIES = ['Emergency', 'Medical', 'Resource', 'Safe', 'General'];

async function testClassification() {
  console.log('🧪 Testing Gemini API Classification...\n');

  const testMessages = [
    "Building collapsed, people trapped inside!",
    "Need medical supplies, someone is bleeding",
    "Looking for food and water for 10 people",
    "We are safe in the shelter, no injuries",
    "What's the weather forecast for tomorrow?"
  ];

  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    console.log(`Test ${i + 1}: "${message}"`);
    
    try {
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
      
      const category = VALID_CATEGORIES.find(cat => 
        text.toLowerCase().includes(cat.toLowerCase())
      ) || 'General';
      
      console.log(`✅ Result: ${category}`);
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log(`🔄 Fallback: General`);
    }
    
    console.log('---');
  }
  
  console.log('🎉 Test completed!\n');
  
  // Test API key configuration
  if (process.env.GEMINI_API_KEY) {
    console.log('✅ API Key: Configured');
  } else {
    console.log('❌ API Key: Missing');
  }
}

testClassification().catch(console.error);