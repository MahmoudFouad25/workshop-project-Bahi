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

// Claude API Key
const CLAUDE_API_KEY = "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";

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { firebaseConfig, CLAUDE_API_KEY };
}

