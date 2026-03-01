/**
 * Frontend Integration Example for Crisis Classification API
 * Add this to your existing frontend JavaScript files
 */

// Configuration
const API_BASE_URL = 'http://localhost:3001';

/**
 * Classify a crisis message using the backend API
 * @param {string} message - The crisis message to classify
 * @returns {Promise<Object>} Classification result
 */
async function classifyCrisisMessage(message) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/classify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Classification error:', error);
    return { 
      success: false, 
      error: error.message,
      data: { category: 'General' } // Fallback
    };
  }
}

/**
 * Example usage in a form submission
 */
function setupCrisisForm() {
  const form = document.getElementById('crisis-form');
  const messageInput = document.getElementById('crisis-message');
  const categoryDisplay = document.getElementById('category-result');
  const submitButton = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    if (!message) {
      alert('Please enter a crisis message');
      return;
    }

    // Show loading state
    submitButton.disabled = true;
    submitButton.textContent = 'Classifying...';
    categoryDisplay.textContent = 'Analyzing message...';

    try {
      // Classify the message
      const result = await classifyCrisisMessage(message);
      
      if (result.success) {
        const category = result.data.category;
        categoryDisplay.textContent = `Category: ${category}`;
        
        // Style based on category
        categoryDisplay.className = `category-${category.toLowerCase()}`;
        
        // You can add different handling based on category
        handleCategoryResult(category, message);
      } else {
        categoryDisplay.textContent = 'Classification failed. Defaulted to General.';
        categoryDisplay.className = 'category-general';
      }
    } catch (error) {
      categoryDisplay.textContent = 'Error: Could not classify message';
      categoryDisplay.className = 'category-error';
    } finally {
      // Reset button
      submitButton.disabled = false;
      submitButton.textContent = 'Submit Report';
    }
  });
}

/**
 * Handle different category results
 * @param {string} category - The classified category
 * @param {string} message - Original message
 */
function handleCategoryResult(category, message) {
  const actions = {
    'Emergency': () => {
      // High priority - alert authorities, show urgent UI
      showUrgentAlert('EMERGENCY DETECTED: Authorities will be notified immediately');
      sendToEmergencyServices(message);
    },
    'Medical': () => {
      // Medical priority - suggest medical contacts
      showMedicalAlert('Medical situation detected. Consider contacting medical services.');
    },
    'Resource': () => {
      // Resource request - connect to aid networks
      showResourceAlert('Resource request logged. Connecting to aid networks.');
    },
    'Safe': () => {
      // Safety confirmation - positive feedback
      showSafeAlert('Safety confirmation received. Thank you for the update.');
    },
    'General': () => {
      // General information - standard processing
      showGeneralAlert('Report received and logged.');
    }
  };

  const action = actions[category];
  if (action) {
    action();
  }
}

/**
 * Alert functions for different categories
 */
function showUrgentAlert(message) {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-emergency';
  alertDiv.innerHTML = `
    <strong>🚨 ${message}</strong>
    <p>Emergency services have been notified.</p>
  `;
  document.body.appendChild(alertDiv);
  
  // Auto-remove after 10 seconds
  setTimeout(() => alertDiv.remove(), 10000);
}

function showMedicalAlert(message) {
  console.log('🏥', message);
  // Add your medical alert UI logic here
}

function showResourceAlert(message) {
  console.log('📦', message);
  // Add your resource alert UI logic here
}

function showSafeAlert(message) {
  console.log('✅', message);
  // Add your safety confirmation UI logic here
}

function showGeneralAlert(message) {
  console.log('📝', message);
  // Add your general alert UI logic here
}

function sendToEmergencyServices(message) {
  // Implement emergency services notification
  console.log('🚨 Emergency services notified:', message);
}

/**
 * Batch classification for multiple messages
 * @param {string[]} messages - Array of messages to classify
 * @returns {Promise<Object[]>} Array of classification results
 */
async function batchClassifyMessages(messages) {
  const promises = messages.map(message => classifyCrisisMessage(message));
  const results = await Promise.all(promises);
  return results;
}

/**
 * Initialize the crisis classification system
 */
document.addEventListener('DOMContentLoaded', () => {
  setupCrisisForm();
  console.log('Crisis Classification System initialized ✅');
});

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    classifyCrisisMessage,
    batchClassifyMessages,
    handleCategoryResult
  };
}