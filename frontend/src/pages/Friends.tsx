import React, { useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Input,
  VStack,
  HStack,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Avatar,
  Badge,
  Divider,
  IconButton,
  useClipboard,
} from '@chakra-ui/react';
import { CopyIcon, CheckIcon } from '@chakra-ui/icons';
import { useAuth } from '../context/AuthContext';
import { useFriends } from '../context/FriendsContext';
import Layout from '../components/Layout';

const Friends: React.FC = () => {
  const [friendCode, setFriendCode] = useState('');
  const { user } = useAuth();
  const {
    friends,
    friendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    isLoading,
  } = useFriends();
  const toast = useToast();
  const { hasCopied, onCopy } = useClipboard(user?.friendCode || '');

  const handleSendRequest = async () => {
    if (!friendCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a friend code',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      await sendFriendRequest(friendCode);
      setFriendCode('');
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
        description: error.message || 'Failed to send friend request',
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

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await removeFriend(friendId);
      toast({
        title: 'Friend removed',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to remove friend',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const pendingRequests = friendRequests.filter(request => request.status === 'pending');

  return (
    <Layout>
      <Container maxW="container.xl">
        <VStack spacing={8} align="stretch">
          <Box>
            <Heading size="lg" mb={4}>Friends & Connections</Heading>
            <HStack spacing={4} mb={6}>
              <Text fontSize="lg">Your Friend Code:</Text>
              <Text
                fontSize="xl"
                fontWeight="bold"
                color="brand.500"
                bg="brand.50"
                px={4}
                py={2}
                borderRadius="md"
              >
                {user?.friendCode}
              </Text>
            </HStack>
          </Box>

          <Box>
            <Heading size="md" mb={4}>Add Friend</Heading>
            <HStack>
              <Input
                placeholder="Enter friend code"
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value)}
              />
              <Button colorScheme="brand" onClick={handleSendRequest}>
                Send Request
              </Button>
            </HStack>
          </Box>

          <Divider />

          <Tabs colorScheme="brand">
            <TabList>
              <Tab>Friends ({friends.length})</Tab>
              <Tab>Requests ({pendingRequests.length})</Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  {friends.map((friend) => (
                    <Box
                      key={friend._id}
                      p={4}
                      borderWidth={1}
                      borderRadius="lg"
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <HStack>
                        <Avatar
                          size="sm"
                          name={friend.username}
                          src={friend.profilePicture}
                        />
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="bold">{friend.username}</Text>
                          <Text fontSize="sm" color="gray.500">
                            {friend.email}
                          </Text>
                        </VStack>
                      </HStack>
                      <Button
                        colorScheme="red"
                        size="sm"
                        onClick={() => handleRemoveFriend(friend._id)}
                      >
                        Remove
                      </Button>
                    </Box>
                  ))}
                  {friends.length === 0 && (
                    <Text color="gray.500" textAlign="center">
                      No friends yet. Add some using their friend code!
                    </Text>
                  )}
                </VStack>
              </TabPanel>

              <TabPanel>
                <VStack spacing={4} align="stretch">
                  {pendingRequests.map((request) => (
                    <Box
                      key={request._id || `request-${request.sender._id}`}
                      p={4}
                      borderWidth={1}
                      borderRadius="lg"
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <HStack>
                        <Avatar
                          size="sm"
                          name={request.sender.username}
                          src={request.sender.profilePicture}
                        />
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="bold">{request.sender.username}</Text>
                          <Text fontSize="sm" color="gray.500">
                            {request.sender.email}
                          </Text>
                        </VStack>
                      </HStack>
                      <HStack>
                        <Button
                          colorScheme="green"
                          size="sm"
                          onClick={() => handleAcceptRequest(request.sender._id)}
                        >
                          Accept
                        </Button>
                        <Button
                          colorScheme="red"
                          size="sm"
                          onClick={() => handleRejectRequest(request.sender._id)}
                        >
                          Reject
                        </Button>
                      </HStack>
                    </Box>
                  ))}
                  {pendingRequests.length === 0 && (
                    <Text color="gray.500" textAlign="center">
                      No pending friend requests
                    </Text>
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>
    </Layout>
  );
};

export default Friends; 