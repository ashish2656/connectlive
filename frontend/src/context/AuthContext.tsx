import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { API_ENDPOINTS } from '../config/api';

// Default API URL if environment variable is not set
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

interface User {
  id: string;
  username: string;
  email: string;
  friendCode: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cookie configuration
const COOKIE_OPTIONS = {
  expires: 7, // 7 days
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get('token');
    if (token) {
      fetchUserProfile();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = Cookies.get('token');
      if (!token) return;

      const response = await axios.get(API_ENDPOINTS.users.profile, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUser(response.data);
      setToken(token);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Cookies.remove('token');
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await axios.post(API_ENDPOINTS.auth.login, {
        email,
        password
      });

      const { token: newToken, user: userData } = response.data;

      // Save to cookies
      Cookies.set('token', newToken, COOKIE_OPTIONS);
      Cookies.set('user', JSON.stringify(userData), COOKIE_OPTIONS);

      // Update state
      setToken(newToken);
      setUser(userData);
      setIsAuthenticated(true);

      // Set default authorization header for all future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await axios.post(API_ENDPOINTS.auth.register, {
        username,
        email,
        password
      });

      const { token: newToken, user: userData } = response.data;

      // Save to cookies
      Cookies.set('token', newToken, COOKIE_OPTIONS);
      Cookies.set('user', JSON.stringify(userData), COOKIE_OPTIONS);

      // Update state
      setToken(newToken);
      setUser(userData);
      setIsAuthenticated(true);

      // Set default authorization header for all future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const token = Cookies.get('token');
      if (token) {
        await axios.post(API_ENDPOINTS.auth.logout, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      Cookies.remove('token');
      Cookies.remove('user');
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        isAuthenticated,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 