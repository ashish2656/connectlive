import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Avatar,
  Input,
  InputGroup,
  InputLeftElement,
  Button,
  useToast,
  Divider,
  Card,
  CardBody,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
} from '@chakra-ui/react';
import { SearchIcon, ChevronDownIcon } from '@chakra-ui/icons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useFriends } from '../context/FriendsContext';
import Layout from '../components/Layout';

// Default API URL if environment variable is not set
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

interface SearchUser {
  _id: string;
  username: string;
  email: string;
  friendCode: string;
}

const Profile: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { user, token } = useAuth();
  const { friends, friendRequests, acceptFriendRequest, rejectFriendRequest, sendFriendRequest } = useFriends();
  const toast = useToast();

  const pendingRequests = friendRequests.filter(request => request.status === 'pending');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await axios.get(`${API_URL}/api/users/search?username=${searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchResults(response.data.users);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to search users',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (friendCode: string) => {
    try {
      await sendFriendRequest(friendCode);
      toast({
        title: 'Success',
        description: 'Friend request sent successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to send friend request',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleAcceptRequest = async (userId: string) => {
    try {
      await acceptFriendRequest(userId);
      toast({
        title: 'Friend request accepted',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to accept friend request',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleRejectRequest = async (userId: string) => {
    try {
      await rejectFriendRequest(userId);
      toast({
        title: 'Friend request rejected',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reject friend request',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const isAlreadyFriend = (userId: string) => {
    return friends.some(friend => friend._id === userId);
  };

  return (
    <Layout>
      <Container maxW="container.xl">
        <VStack spacing={8} align="stretch">
          {/* Profile Section */}
          <Box>
            <Heading size="lg" mb={6}>Profile</Heading>
            <Card>
              <CardBody>
                <HStack spacing={6}>
                  <Avatar
                    size="xl"
                    name={user?.username}
                  />
                  <VStack align="start" spacing={2}>
                    <Text fontSize="2xl" fontWeight="bold">{user?.username}</Text>
                    <Text color="gray.600">{user?.email}</Text>
                    <HStack>
                      <Text fontWeight="medium">Friend Code:</Text>
                      <Text
                        bg="brand.50"
                        color="brand.500"
                        px={3}
                        py={1}
                        borderRadius="md"
                        fontFamily="mono"
                      >
                        {user?.friendCode}
                      </Text>
                    </HStack>
                  </VStack>
                </HStack>
              </CardBody>
            </Card>
          </Box>

          <Divider />

          {/* Friends Section */}
          <Box>
            <Heading size="md" mb={4}>Friends</Heading>
            <VStack spacing={4} align="stretch">
              {friends.map((friend) => (
                <Card key={friend._id}>
                  <CardBody>
                    <HStack justify="space-between">
                      <HStack spacing={4}>
                        <Avatar
                          size="md"
                          name={friend.username}
                        />
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="bold">{friend.username}</Text>
                          <Text fontSize="sm" color="gray.600">
                            {friend.email}
                          </Text>
                        </VStack>
                      </HStack>
                    </HStack>
                  </CardBody>
                </Card>
              ))}
              {friends.length === 0 && (
                <Text color="gray.500" textAlign="center">
                  No friends yet. Add some using their friend code!
                </Text>
              )}
            </VStack>
          </Box>

          <Divider />

          {/* Friend Requests Section */}
          <Box>
            <Heading size="md" mb={4}>Friend Requests</Heading>
            <Card>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  {pendingRequests.length > 0 ? (
                    pendingRequests.map((request) => (
                      <HStack key={request._id} justify="space-between">
                        <HStack spacing={4}>
                          <Avatar
                            size="sm"
                            name={request.from.username}
                          />
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="bold">{request.from.username}</Text>
                            <Text fontSize="sm" color="gray.600">
                              {request.from.email}
                            </Text>
                          </VStack>
                        </HStack>
                        <HStack>
                          <Button
                            colorScheme="green"
                            size="sm"
                            onClick={() => handleAcceptRequest(request.from._id)}
                          >
                            Accept
                          </Button>
                          <Button
                            colorScheme="red"
                            size="sm"
                            onClick={() => handleRejectRequest(request.from._id)}
                          >
                            Reject
                          </Button>
                        </HStack>
                      </HStack>
                    ))
                  ) : (
                    <Text color="gray.500" textAlign="center">
                      No pending friend requests
                    </Text>
                  )}
                </VStack>
              </CardBody>
            </Card>
          </Box>

          <Divider />

          {/* Search Section */}
          <Box>
            <Heading size="md" mb={4}>Search Users</Heading>
            <VStack spacing={4} align="stretch">
              <HStack>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <SearchIcon color="gray.400" />
                  </InputLeftElement>
                  <Input
                    placeholder="Search by username"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </InputGroup>
                <Button
                  colorScheme="brand"
                  onClick={handleSearch}
                  isLoading={isSearching}
                >
                  Search
                </Button>
              </HStack>

              {/* Search Results */}
              <VStack spacing={4} align="stretch">
                {searchResults.map((result) => (
                  <Card key={result._id}>
                    <CardBody>
                      <HStack justify="space-between">
                        <HStack spacing={4}>
                          <Avatar
                            size="md"
                            name={result.username}
                          />
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="bold">{result.username}</Text>
                            <Text fontSize="sm" color="gray.600">
                              {result.email}
                            </Text>
                          </VStack>
                        </HStack>
                        {result._id !== user?.id && (
                          <Button
                            colorScheme="brand"
                            size="sm"
                            onClick={() => handleAddFriend(result.friendCode)}
                            isDisabled={isAlreadyFriend(result._id)}
                          >
                            {isAlreadyFriend(result._id) ? 'Already Friends' : 'Add Friend'}
                          </Button>
                        )}
                      </HStack>
                    </CardBody>
                  </Card>
                ))}
                {searchResults.length === 0 && searchQuery && !isSearching && (
                  <Text color="gray.500" textAlign="center">
                    No users found
                  </Text>
                )}
              </VStack>
            </VStack>
          </Box>
        </VStack>
      </Container>
    </Layout>
  );
};

export default Profile; 