/**
 * Script to list available Gemini models
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listAvailableModels() {
  try {
    console.log('🔍 Testing available Gemini models...\n');
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Try simple fallback models
    const modelNames = [
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro-latest', 
      'gemini-1.0-pro',
      'gemini-1.5-flash',
      'gemini-1.5-pro', 
      'gemini-pro'
    ];
    
    for (const modelName of modelNames) {
      try {
        console.log(`Testing model: ${modelName}`);
        console.log(`Testing model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent({
          contents: [{ parts: [{ text: 'Test: Emergency' }] }],
          generationConfig: {
            maxOutputTokens: 5,
            temperature: 0.1,
          },
        });
        
        const response = await result.response;
        console.log(`✅ ${modelName} works! Response: ${response.text()}`);
        console.log(`🎯 Use this model name in your code!\n`);
        return modelName; // Return the working model
        
      } catch (error) {
        console.log(`❌ ${modelName} failed: ${error.message.substring(0, 80)}...`);
      }
    }
    
    console.log('\n❌ No working models found');
    
  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

console.log('API Key configured:', process.env.GEMINI_API_KEY ? 'Yes ✅' : 'No ❌');
listAvailableModels().catch(console.error);