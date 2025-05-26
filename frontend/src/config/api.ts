// API configuration
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Configure axios defaults
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Accept'] = 'application/json';

// Axios interceptor for handling errors
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export const API_ENDPOINTS = {
  auth: {
    login: `/api/auth/login`,
    register: `/api/auth/register`,
    logout: `/api/auth/logout`,
  },
  users: {
    profile: `/api/users/profile`,
    search: `/api/users/search`,
  },
  friends: {
    list: `/api/friends`,
    add: `/api/friends/request`,
    remove: `/api/friends`,
    requests: `/api/friends/requests`,
  },
};

export default API_ENDPOINTS; 