// API configuration
import axios from 'axios';

const API_BASE_URL = 'https://connectlive-backend.onrender.com';

// Configure axios defaults
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Accept'] = 'application/json';

// Add request interceptor for debugging
axios.interceptors.request.use(
  config => {
    console.log('Making request to:', config.url);
    return config;
  },
  error => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Axios interceptor for handling errors
axios.interceptors.response.use(
  response => {
    console.log('Response received:', response.status);
    return response;
  },
  error => {
    console.error('Response error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message
    });

    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
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