import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  Heading,
  Text,
  HStack,
  VStack,
  Flex,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useFriends } from '../context/FriendsContext';
import Layout from '../components/Layout';

// Default API URL if environment variable is not set
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

interface Participant {
  id: string;
  username: string;
  stream?: MediaStream;
}

interface Room {
  _id: string;
  name: string;
  roomId: string;
  host: string;
  participants: string[];
  isPrivate: boolean;
}

const Room: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, token } = useAuth();
  const { friends } = useFriends();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<{ [key: string]: RTCPeerConnection }>({});

  // Fetch my rooms
  useEffect(() => {
    const fetchMyRooms = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/rooms`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMyRooms(response.data.filter((room: Room) => room.host === user?.id));
      } catch (error) {
        console.error('Error fetching rooms:', error);
      }
    };

    if (token) {
      fetchMyRooms();
    }
  }, [token, user?.id]);

  // Fetch current room details
  useEffect(() => {
    const fetchCurrentRoom = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCurrentRoom(response.data);
      } catch (error) {
        console.error('Error fetching current room:', error);
        navigate('/');
      }
    };

    if (roomId && token) {
      fetchCurrentRoom();
    }
  }, [roomId, token, user?.id, navigate]);

  const handleLeaveRoom = async () => {
    try {
      await axios.post(
        `${API_URL}/api/rooms/${roomId}/leave`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Clean up resources
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      socketRef.current?.disconnect();
      
      navigate('/');
    } catch (error) {
      console.error('Error leaving room:', error);
      navigate('/');
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    if (!localStreamRef.current && !isVideoEnabled) {
      // Start video
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          localStreamRef.current = stream;
          setParticipants(prev => [
            ...prev,
            { id: user!.id, username: user!.username, stream }
          ]);
          setIsVideoEnabled(true);
        })
        .catch(error => {
          console.error('Error accessing camera:', error);
        });
    } else if (localStreamRef.current) {
      // Stop video
      localStreamRef.current.getVideoTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setParticipants(prev => prev.filter(p => p.id !== user?.id));
      setIsVideoEnabled(false);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach(track => track.stop());
        }
        localStreamRef.current = stream;
        setParticipants(prev => {
          const withoutUser = prev.filter(p => p.id !== user?.id);
          return [...withoutUser, { id: user!.id, username: user!.username, stream }];
        });
        setIsScreenSharing(true);
        
        // Listen for when user stops sharing via browser controls
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          localStreamRef.current = null;
          setParticipants(prev => prev.filter(p => p.id !== user?.id));
        };
      } else {
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach(track => track.stop());
          localStreamRef.current = null;
          setParticipants(prev => prev.filter(p => p.id !== user?.id));
        }
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  };

  const handleInviteFriend = async (friendId: string) => {
    try {
      await axios.post(
        `${API_URL}/api/rooms/${roomId}/invite`,
        { userId: friendId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({
        title: 'Success',
        description: 'Friend invited successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to invite friend',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Layout>
      <Container maxW="container.xl">
        <Grid templateColumns={{ base: "1fr", lg: "3fr 1fr" }} gap={8}>
          {/* Left section - Currently Joined Room */}
          <Box>
            <Flex justify="space-between" align="center" mb={4}>
              <VStack align="start" spacing={1}>
                <Heading size="lg">Currently Joined Room</Heading>
                {currentRoom && (
                  <Text color="gray.600">
                    {currentRoom.name} ({participants.length} participants)
                  </Text>
                )}
              </VStack>
              <HStack>
                <Menu>
                  <MenuButton
                    as={Button}
                    rightIcon={<ChevronDownIcon />}
                    colorScheme="blue"
                  >
                    Invite Friends
                  </MenuButton>
                  <MenuList>
                    {friends.length > 0 ? (
                      friends.map((friend) => (
                        <MenuItem
                          key={friend._id}
                          onClick={() => handleInviteFriend(friend._id)}
                        >
                          {friend.username}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem isDisabled>No friends to invite</MenuItem>
                    )}
                  </MenuList>
                </Menu>
                <Button colorScheme="blue" onClick={handleLeaveRoom}>
                  Leave Room
                </Button>
              </HStack>
            </Flex>

            <HStack spacing={4} mb={6}>
              <Button
                colorScheme={isAudioEnabled ? "blue" : "red"}
                onClick={toggleAudio}
              >
                {isAudioEnabled ? 'Mute' : 'Unmute'}
              </Button>
              <Button
                colorScheme="blue"
                onClick={toggleVideo}
              >
                {isVideoEnabled ? 'Stop Video' : 'Start Video'}
              </Button>
              <Button
                colorScheme="blue"
                onClick={toggleScreenShare}
              >
                Share Screen
              </Button>
            </HStack>

            <Box
              borderRadius="lg"
              overflow="hidden"
              bg="black"
              height="600px"
              position="relative"
            >
              {participants.map((participant) => (
                participant.stream ? (
                  <video
                    key={participant.id}
                    ref={el => {
                      if (el && participant.stream) {
                        el.srcObject = participant.stream;
                      }
                    }}
                    autoPlay
                    playsInline
                    muted={participant.id === user?.id}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <Flex
                    key={participant.id}
                    height="100%"
                    align="center"
                    justify="center"
                  >
                    <Text color="white">Camera is off</Text>
                  </Flex>
                )
              ))}
              {participants.length === 0 && (
                <Flex
                  height="100%"
                  align="center"
                  justify="center"
                >
                  <Text color="white">No active video</Text>
                </Flex>
              )}
            </Box>
          </Box>

          {/* Right section - My Rooms */}
          <Box>
            <Heading size="lg" mb={4}>My Rooms</Heading>
            {myRooms.length === 0 ? (
              <Text color="gray.600">You haven't created any rooms yet.</Text>
            ) : (
              <VStack spacing={4} align="stretch">
                {myRooms.map((room) => (
                  <Box
                    key={room._id}
                    p={4}
                    borderWidth={1}
                    borderRadius="lg"
                  >
                    <Text fontWeight="bold">{room.name}</Text>
                    <Text fontSize="sm" color="gray.600">
                      {room.participants.length} participants
                    </Text>
                  </Box>
                ))}
              </VStack>
            )}
          </Box>
        </Grid>
      </Container>
    </Layout>
  );
};

export default Room; 