// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAwgsHYsgV6W4WAZCIsaOXSlvw3sNHQS-Q",
  authDomain: "workshop-lifecycle-makers.firebaseapp.com",
  projectId: "workshop-lifecycle-makers",
  storageBucket: "workshop-lifecycle-makers.firebasestorage.app",
  messagingSenderId: "989952488845",
  appId: "1:989952488845:web:4e75745430c1e39e6ff9c4",
  measurementId: "G-8JYKNDE51B"
};

// Gemini API Key
const GEMINI_API_KEY = "AIzaSyBxVNmc29MjWqSm4QAyLocDMjvkLim7bus";

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { firebaseConfig, GEMINI_API_KEY };
}
