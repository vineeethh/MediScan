// API Configuration
const API_BASE_URL = 'http://localhost:3001/api';

// Helper function to get auth token
const getAuthToken = () => localStorage.getItem('mediscan_token');

// Helper function to set auth token
const setAuthToken = (token) => localStorage.setItem('mediscan_token', token);

// Helper function to remove auth token
const removeAuthToken = () => localStorage.removeItem('mediscan_token');

// Helper function to get user data
const getUserData = () => {
  const userData = localStorage.getItem('mediscan_user');
  return userData ? JSON.parse(userData) : null;
};

// Helper function to set user data
const setUserData = (user) => {
  localStorage.setItem('mediscan_user', JSON.stringify(user));
};

// Helper function to clear user data
const clearUserData = () => {
  localStorage.removeItem('mediscan_user');
  removeAuthToken();
};

// Generic API call function
async function apiCall(endpoint, options = {}) {
  const token = getAuthToken();
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    }
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ==================
// AUTH API
// ==================

export const authAPI = {
  // Sign up new user
  signup: async (name, email, password) => {
    try {
      const data = await apiCall('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });

      if (data.success && data.token) {
        setAuthToken(data.token);
        setUserData(data.data);
      }

      return data;
    } catch (error) {
      throw error;
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (data.success && data.token) {
        setAuthToken(data.token);
        setUserData(data.data);
      }

      return data;
    } catch (error) {
      throw error;
    }
  },

  // Logout user
  logout: () => {
    clearUserData();
  },

  // Get current user profile
  getProfile: async () => {
    try {
      return await apiCall('/auth/me');
    } catch (error) {
      throw error;
    }
  },

  // Update user profile
  updateProfile: async (updates) => {
    try {
      return await apiCall('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    } catch (error) {
      throw error;
    }
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    try {
      return await apiCall('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });
    } catch (error) {
      throw error;
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!getAuthToken();
  },

  // Get current user data
  getCurrentUser: () => {
    return getUserData();
  }
};

// ==================
// CHAT API
// ==================

export const chatAPI = {
  // Send message to AI
  sendMessage: async (message, doctorType, sessionId = null, language = 'en', profile = null) => {
    try {
      return await apiCall('/chat/message', {
        method: 'POST',
        body: JSON.stringify({ message, doctorType, sessionId, language, ...(profile && { profile }) })
      });
    } catch (error) {
      throw error;
    }
  },

  // Stream AI response — onToken called for each chunk, returns full text
  streamMessage: async (message, doctorType, sessionId = null, language = 'en', profile = null, onToken) => {
    const token = getAuthToken();
    const payload = { message, doctorType, sessionId, language, ...(profile && { profile }) };
    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: JSON.stringify(payload)
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let sessionIdResult = sessionId;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.token) { fullText += data.token; if (onToken) onToken(data.token); }
          if (data.done) sessionIdResult = data.sessionId;
          if (data.error) throw new Error(data.error);
        } catch {}
      }
    }
    return { text: fullText, sessionId: sessionIdResult };
  },

  // Get conversation by session ID
  getConversation: async (sessionId) => {
    try {
      return await apiCall(`/chat/conversation/${sessionId}`);
    } catch (error) {
      throw error;
    }
  },

  // Get conversation history (requires auth)
  getHistory: async (page = 1, limit = 10, doctorType = null) => {
    try {
      const params = new URLSearchParams({ page, limit });
      if (doctorType) params.append('doctorType', doctorType);
      
      return await apiCall(`/chat/history?${params.toString()}`);
    } catch (error) {
      throw error;
    }
  },

  // Delete conversation (requires auth)
  deleteConversation: async (sessionId) => {
    try {
      return await apiCall(`/chat/conversation/${sessionId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      throw error;
    }
  },

  // Rate conversation
  rateConversation: async (sessionId, rating, feedback = null) => {
    try {
      return await apiCall(`/chat/conversation/${sessionId}/rate`, {
        method: 'POST',
        body: JSON.stringify({ rating, feedback })
      });
    } catch (error) {
      throw error;
    }
  },

  // Analyze symptoms
  analyzeSymptoms: async (symptoms) => {
    try {
      return await apiCall('/chat/analyze', {
        method: 'POST',
        body: JSON.stringify({ symptoms })
      });
    } catch (error) {
      throw error;
    }
  }
};

// ==================
// PROFILE API (Patient Profile for Personal AI Doctor)
// ==================

export const profileAPI = {
  // Get patient profile
  getProfile: async () => {
    try {
      return await apiCall('/profile');
    } catch (error) {
      throw error;
    }
  },

  // Update basic information
  updateBasicInfo: async (basicInfo) => {
    try {
      return await apiCall('/profile/basic', {
        method: 'PUT',
        body: JSON.stringify(basicInfo)
      });
    } catch (error) {
      throw error;
    }
  },

  // Update medical history
  updateMedicalHistory: async (medicalHistory) => {
    try {
      return await apiCall('/profile/medical-history', {
        method: 'PUT',
        body: JSON.stringify(medicalHistory)
      });
    } catch (error) {
      throw error;
    }
  },

  // Update lifestyle information
  updateLifestyle: async (lifestyle) => {
    try {
      return await apiCall('/profile/lifestyle', {
        method: 'PUT',
        body: JSON.stringify(lifestyle)
      });
    } catch (error) {
      throw error;
    }
  },

  // Get profile summary
  getSummary: async () => {
    try {
      return await apiCall('/profile/summary');
    } catch (error) {
      throw error;
    }
  },

  // Check profile status
  checkStatus: async () => {
    try {
      return await apiCall('/profile/status');
    } catch (error) {
      throw error;
    }
  }
};

// ==================
// HOSPITAL API
// ==================

export const hospitalAPI = {
  // Find nearby hospitals by coordinates
  findNearby: async (latitude, longitude, radius = 5000) => {
    try {
      return await apiCall('/hospitals/nearby', {
        method: 'POST',
        body: JSON.stringify({ latitude, longitude, radius })
      });
    } catch (error) {
      throw error;
    }
  },

  // Geocode address to coordinates
  geocodeAddress: async (address) => {
    try {
      return await apiCall('/hospitals/geocode', {
        method: 'POST',
        body: JSON.stringify({ address })
      });
    } catch (error) {
      throw error;
    }
  },

  // Search hospitals by address
  searchByAddress: async (address, radius = 5000) => {
    try {
      return await apiCall('/hospitals/search', {
        method: 'POST',
        body: JSON.stringify({ address, radius })
      });
    } catch (error) {
      throw error;
    }
  }
};

// ==================
// ANALYTICS API
// ==================

export const analyticsAPI = {
  // Get current statistics
  getStats: async () => {
    try {
      return await apiCall('/analytics/stats');
    } catch (error) {
      throw error;
    }
  },

  // Get analytics history (admin only)
  getHistory: async (days = 30) => {
    try {
      return await apiCall(`/analytics/history?days=${days}`);
    } catch (error) {
      throw error;
    }
  },

  // Get user statistics (admin only)
  getUserStats: async () => {
    try {
      return await apiCall('/analytics/users');
    } catch (error) {
      throw error;
    }
  },

  // Get conversation statistics (admin only)
  getConversationStats: async () => {
    try {
      return await apiCall('/analytics/conversations');
    } catch (error) {
      throw error;
    }
  }
};

// ==================
// HEALTH REPORT API
// ==================

export const reportAPI = {
  analyze: async (file, language = 'en') => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('report', file);
    formData.append('language', language);
    const response = await fetch(`${API_BASE_URL}/reports/analyze`, {
      method: 'POST',
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      body: formData
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Analysis failed');
    return data;
  },
  getHistory: async () => apiCall('/reports/history'),
  getReport: async (id) => apiCall(`/reports/${id}`)
};

// ==================
// REMINDER API
// ==================

export const reminderAPI = {
  getAll: async () => apiCall('/reminders'),
  create: async (reminder) => apiCall('/reminders', { method: 'POST', body: JSON.stringify(reminder) }),
  update: async (id, data) => apiCall(`/reminders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggle: async (id) => apiCall(`/reminders/${id}/toggle`, { method: 'PATCH' }),
  delete: async (id) => apiCall(`/reminders/${id}`, { method: 'DELETE' })
};

// ==================
// HEALTH CHECK
// ==================

export const healthAPI = {
  // Check API health
  checkHealth: async () => {
    try {
      return await apiCall('/health');
    } catch (error) {
      throw error;
    }
  }
};

// Export utility functions
export const utils = {
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  getUserData,
  setUserData,
  clearUserData,
  isAuthenticated: authAPI.isAuthenticated,
  getCurrentUser: authAPI.getCurrentUser
};

// Default export
export default {
  auth: authAPI,
  chat: chatAPI,
  profile: profileAPI,
  hospital: hospitalAPI,
  analytics: analyticsAPI,
  health: healthAPI,
  report: reportAPI,
  reminder: reminderAPI,
  utils
};
