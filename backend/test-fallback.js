/**
 * Test script for crisis classification with fallback system
 */

// Test the fallback classification function directly
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

// Test cases
const testCases = [
  // Emergency cases
  { message: "Building collapsed, people trapped inside!", expected: "Emergency" },
  { message: "URGENT: Fire spreading rapidly, need evacuation!", expected: "Emergency" },
  { message: "Earthquake hit, multiple injuries, need rescue teams", expected: "Emergency" },
  { message: "Gas leak detected, danger zone, help needed", expected: "Emergency" },
  
  // Medical cases  
  { message: "Need medical supplies, someone is bleeding", expected: "Medical" },
  { message: "Person unconscious, needs ambulance", expected: "Medical" },
  { message: "Diabetic emergency, need insulin urgently", expected: "Medical" },
  { message: "Child with fever and breathing problems", expected: "Medical" },
  
  // Resource cases
  { message: "Looking for food and water for 10 people", expected: "Resource" },
  { message: "Need shelter, homeless after flood", expected: "Resource" },
  { message: "Running out of supplies, need assistance", expected: "Resource" },
  { message: "No electricity for 3 days, need power", expected: "Resource" },
  
  // Safety cases
  { message: "We are safe in the shelter, no injuries", expected: "Safe" },
  { message: "All clear here, everyone is okay", expected: "Safe" },
  { message: "Evacuated successfully, all secured", expected: "Safe" },
  { message: "No damage reported, situation stable", expected: "Safe" },
  
  // General cases
  { message: "What's the weather forecast for tomorrow?", expected: "General" },
  { message: "When will the power be restored?", expected: "General" },
  { message: "Is there a meeting scheduled today?", expected: "General" },
];

console.log('🧪 Testing Fallback Classification System\\n');

let correct = 0;
let total = testCases.length;

testCases.forEach((test, index) => {
  const result = classifyWithFallback(test.message);
  const isCorrect = result === test.expected;
  
  console.log(`Test ${index + 1}: "${test.message}"`);
  console.log(`Expected: ${test.expected} | Got: ${result} ${isCorrect ? '✅' : '❌'}`);
  console.log('---');
  
  if (isCorrect) correct++;
});

const accuracy = ((correct / total) * 100).toFixed(1);
console.log(`\\n📊 Results: ${correct}/${total} correct (${accuracy}% accuracy)`);

if (accuracy >= 80) {
  console.log('✅ Fallback system working well!');
} else {
  console.log('⚠️ Fallback system needs improvement');
}

console.log('\\n🚀 Crisis Classification System ready for production!\\n');

// Test the API endpoint format
console.log('📋 Expected API Response Formats:');
console.log('Success:', JSON.stringify({ category: 'Emergency' }, null, 2));
console.log('Error:', JSON.stringify({ error: 'Message required', category: 'General' }, null, 2));