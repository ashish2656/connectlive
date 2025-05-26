import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

// Default API URL if environment variable is not set
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

interface Friend {
  _id: string;
  username: string;
  email: string;
  friendCode: string;
  profilePicture: string;
}

interface FriendRequest {
  _id: string;
  from: Friend;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

interface FriendsContextType {
  friends: Friend[];
  friendRequests: FriendRequest[];
  sendFriendRequest: (friendCode: string) => Promise<void>;
  acceptFriendRequest: (userId: string) => Promise<void>;
  rejectFriendRequest: (userId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  isLoading: boolean;
  refetchFriends: () => Promise<void>;
}

const FriendsContext = createContext<FriendsContextType | undefined>(undefined);

export const useFriends = () => {
  const context = useContext(FriendsContext);
  if (!context) {
    throw new Error('useFriends must be used within a FriendsProvider');
  }
  return context;
};

export const FriendsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();

  const fetchFriends = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFriends(response.data.friends);
      setFriendRequests(response.data.friendRequests);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchFriends();
    }
  }, [token]);

  const sendFriendRequest = async (friendCode: string) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/friends/request/${friendCode}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchFriends();
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  };

  const acceptFriendRequest = async (userId: string) => {
    try {
      await axios.post(
        `${API_URL}/api/friends/accept/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchFriends();
    } catch (error) {
      throw error;
    }
  };

  const rejectFriendRequest = async (userId: string) => {
    try {
      await axios.post(
        `${API_URL}/api/friends/reject/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchFriends();
    } catch (error) {
      throw error;
    }
  };

  const removeFriend = async (friendId: string) => {
    try {
      await axios.delete(
        `${API_URL}/api/friends/${friendId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchFriends();
    } catch (error) {
      throw error;
    }
  };

  return (
    <FriendsContext.Provider
      value={{
        friends,
        friendRequests,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        removeFriend,
        isLoading,
        refetchFriends: fetchFriends
      }}
    >
      {children}
    </FriendsContext.Provider>
  );
};

export default FriendsContext; 