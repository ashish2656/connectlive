// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const API_ENDPOINTS = {
  auth: {
    login: `${API_BASE_URL}/api/auth/login`,
    register: `${API_BASE_URL}/api/auth/register`,
    logout: `${API_BASE_URL}/api/auth/logout`,
  },
  users: {
    profile: `${API_BASE_URL}/api/users/profile`,
    search: `${API_BASE_URL}/api/users/search`,
  },
  friends: {
    list: `${API_BASE_URL}/api/friends`,
    add: `${API_BASE_URL}/api/friends/add`,
    remove: `${API_BASE_URL}/api/friends/remove`,
    requests: `${API_BASE_URL}/api/friends/requests`,
  },
};

export default API_ENDPOINTS; 