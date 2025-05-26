import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Grid,
  Flex,
  IconButton,
  Text,
  useColorModeValue,
  HStack,
  VStack,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Input,
  Button,
  List,
  ListItem,
  Avatar,
  Badge,
  Divider,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import {
  MicrophoneIcon,
  VideoCameraIcon,
  PhoneIcon,
  ChatIcon,
  UsersIcon,
  ShareIcon,
  PencilIcon,
} from '@heroicons/react/solid';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Socket } from 'socket.io-client';
import io from 'socket.io-client';

// Framer Motion variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1
  }
};

const MotionBox = motion(Box);
const MotionGrid = motion(Grid);

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
}

interface Participant {
  id: string;
  username: string;
  stream?: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
}

type RouteParams = {
  roomId: string;
};

const VideoRoom: React.FC = () => {
  const params = useParams<keyof RouteParams>();
  const roomId = params.roomId;
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [activeTab, setActiveTab] = useState<'chat' | 'whiteboard'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [focusedParticipant, setFocusedParticipant] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket>();
  const mediaRecorderRef = useRef<MediaRecorder>();
  const whiteboardRef = useRef<any>(null);
  const peerConnections = useRef<{ [key: string]: RTCPeerConnection }>({});

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const sidebarBg = useColorModeValue('gray.50', 'gray.900');

  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }

    // Initialize socket connection
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5001');
    socketRef.current = socket;

    // Join room
    socket.emit('join-room', { roomId, userId: user?.id, username: user?.username });

    // Listen for new participants
    socket.on('user-connected', ({ userId, username }) => {
      setParticipants(prev => [...prev, {
        id: userId,
        username,
        audioEnabled: true,
        videoEnabled: true,
        isScreenSharing: false
      }]);
      // Initialize peer connection for new user
      createPeerConnection(userId);
    });

    // Listen for participant disconnection
    socket.on('user-disconnected', ({ userId }) => {
      setParticipants(prev => prev.filter(p => p.id !== userId));
      if (peerConnections.current[userId]) {
        peerConnections.current[userId].close();
        delete peerConnections.current[userId];
      }

      // If last person leaves, delete the room
      if (participants.length === 1) {
        socket.emit('delete-room', roomId);
        navigate('/');
      }
    });

    // Initialize WebRTC
    const initializeRoom = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Add local participant
        setParticipants(prev => [{
          id: user?.id || '',
          username: user?.username || '',
          stream,
          audioEnabled: true,
          videoEnabled: true,
          isScreenSharing: false
        }]);

      } catch (error) {
        console.error('Error accessing media devices:', error);
      }
    };

    initializeRoom();

    return () => {
      // Cleanup
      socket.emit('leave-room', { roomId, userId: user?.id });
      socket.disconnect();
      if (localVideoRef.current?.srcObject) {
        const tracks = (localVideoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
      // Close all peer connections
      Object.values(peerConnections.current).forEach(pc => pc.close());
      peerConnections.current = {};
    };
  }, [roomId, user, navigate]);

  const handleParticipantClick = (participantId: string) => {
    setFocusedParticipant(focusedParticipant === participantId ? null : participantId);
  };

  const handleToggleAudio = () => {
    if (localVideoRef.current?.srcObject) {
      const audioTrack = (localVideoRef.current.srcObject as MediaStream)
        .getAudioTracks()[0];
      audioTrack.enabled = !isAudioEnabled;
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const handleToggleVideo = () => {
    if (localVideoRef.current?.srcObject) {
      const videoTrack = (localVideoRef.current.srcObject as MediaStream)
        .getVideoTracks()[0];
      videoTrack.enabled = !isVideoEnabled;
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const handleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });
        // Handle screen sharing stream
        setIsScreenSharing(true);
      } else {
        // Stop screen sharing
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };

  const handleStartRecording = () => {
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.href = url;
        a.download = `recording-${Date.now()}.webm`;
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        sender: user?.username || 'Anonymous',
        content: newMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      // Emit message to socket
    }
  };

  const handleLeaveRoom = () => {
    // Cleanup and navigate
    navigate('/');
  };

  const createPeerConnection = (userId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // Add local stream
    if (localVideoRef.current?.srcObject) {
      (localVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => {
        if (localVideoRef.current?.srcObject) {
          pc.addTrack(track, localVideoRef.current.srcObject as MediaStream);
        }
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = event => {
      if (event.candidate) {
        socketRef.current?.emit('ice-candidate', {
          candidate: event.candidate,
          to: userId
        });
      }
    };

    // Handle incoming streams
    pc.ontrack = event => {
      setParticipants(prev => {
        const participant = prev.find(p => p.id === userId);
        if (participant) {
          participant.stream = event.streams[0];
          return [...prev];
        }
        return prev;
      });
    };

    peerConnections.current[userId] = pc;
    return pc;
  };

  return (
    <Box h="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
      {/* Top Bar */}
      <Flex
        position="fixed"
        top={0}
        w="full"
        h="60px"
        bg={bgColor}
        borderBottom="1px"
        borderColor={borderColor}
        px={4}
        align="center"
        justify="space-between"
        zIndex={2}
      >
        <Text fontSize="lg" fontWeight="bold">Room: {roomId}</Text>
        <HStack>
          <Badge colorScheme="green">{participants.length} participants</Badge>
          <Button colorScheme="red" size="sm" onClick={handleLeaveRoom}>
            Leave Room
          </Button>
        </HStack>
      </Flex>

      {/* Main Content */}
      <Flex h="calc(100vh - 140px)" mt="60px">
        {/* Video Grid */}
        <Box flex={1} p={4} overflow="auto">
          <Grid
            templateColumns={
              focusedParticipant
                ? "1fr"
                : "repeat(auto-fit, minmax(300px, 1fr))"
            }
            gap={4}
          >
            {participants.map(participant => (
              focusedParticipant === null || focusedParticipant === participant.id ? (
                <Box
                  key={participant.id}
                  position="relative"
                  borderRadius="lg"
                  overflow="hidden"
                  bg="black"
                  aspectRatio={16/9}
                >
                  <video
                    ref={participant.id === user?.id ? localVideoRef : undefined}
                    autoPlay
                    muted={participant.id === user?.id}
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  <Box
                    position="absolute"
                    bottom={2}
                    left={2}
                    right={2}
                    px={2}
                    py={1}
                    bg="blackAlpha.600"
                    borderRadius="md"
                    color="white"
                  >
                    <Flex justify="space-between" align="center">
                      <Text>{participant.username} {participant.id === user?.id ? '(You)' : ''}</Text>
                      <HStack spacing={2}>
                        {!participant.audioEnabled && (
                          <Box as={MicrophoneIcon} w={4} h={4} color="red.500" />
                        )}
                        {!participant.videoEnabled && (
                          <Box as={VideoCameraIcon} w={4} h={4} color="red.500" />
                        )}
                        {participant.isScreenSharing && (
                          <Box as={ShareIcon} w={4} h={4} color="green.500" />
                        )}
                      </HStack>
                    </Flex>
                  </Box>
                </Box>
              ) : null
            ))}
          </Grid>
        </Box>

        {/* Right Sidebar */}
        <Box
          w="300px"
          h="full"
          bg={sidebarBg}
          borderLeft="1px"
          borderColor={borderColor}
          p={4}
        >
          <VStack spacing={4} h="full">
            <Text fontSize="lg" fontWeight="bold">Participants</Text>
            <List spacing={2} w="full">
              {participants.map(participant => (
                <ListItem
                  key={participant.id}
                  p={2}
                  bg={focusedParticipant === participant.id ? 'brand.100' : 'transparent'}
                  borderRadius="md"
                  cursor="pointer"
                  onClick={() => handleParticipantClick(participant.id)}
                  _hover={{ bg: 'brand.50' }}
                >
                  <Flex align="center" gap={3}>
                    <Avatar size="sm" name={participant.username} />
                    <Box flex={1}>
                      <Text>{participant.username} {participant.id === user?.id ? '(You)' : ''}</Text>
                      <HStack spacing={1}>
                        {!participant.audioEnabled && (
                          <Badge colorScheme="red" variant="subtle">Muted</Badge>
                        )}
                        {!participant.videoEnabled && (
                          <Badge colorScheme="red" variant="subtle">Video Off</Badge>
                        )}
                        {participant.isScreenSharing && (
                          <Badge colorScheme="green" variant="subtle">Sharing</Badge>
                        )}
                      </HStack>
                    </Box>
                  </Flex>
                </ListItem>
              ))}
            </List>

            <Divider />

            <Box w="full">
              <Text fontSize="lg" fontWeight="bold" mb={2}>Quick Actions</Text>
              <VStack spacing={2}>
                <Button
                  w="full"
                  leftIcon={<Box as={focusedParticipant ? UsersIcon : ShareIcon} w={5} h={5} />}
                  onClick={() => setFocusedParticipant(null)}
                  variant="outline"
                >
                  {focusedParticipant ? 'Show All' : 'Share Screen'}
                </Button>
                <Button
                  w="full"
                  leftIcon={<Box as={ChatIcon} w={5} h={5} />}
                  onClick={onOpen}
                  variant="outline"
                >
                  Open Chat
                </Button>
              </VStack>
            </Box>
          </VStack>
        </Box>
      </Flex>

      {/* Bottom Controls */}
      <Flex
        position="fixed"
        bottom={0}
        w="full"
        h="80px"
        bg={bgColor}
        borderTop="1px"
        borderColor={borderColor}
        px={4}
        align="center"
        justify="center"
        gap={4}
      >
        <IconButton
          aria-label="Toggle microphone"
          icon={<Box as={MicrophoneIcon} w={6} h={6} />}
          colorScheme={isAudioEnabled ? 'gray' : 'red'}
          onClick={handleToggleAudio}
        />
        <IconButton
          aria-label="Toggle camera"
          icon={<Box as={VideoCameraIcon} w={6} h={6} />}
          colorScheme={isVideoEnabled ? 'gray' : 'red'}
          onClick={handleToggleVideo}
        />
        <IconButton
          aria-label="Share screen"
          icon={<Box as={ShareIcon} w={6} h={6} />}
          colorScheme={isScreenSharing ? 'brand' : 'gray'}
          onClick={handleScreenShare}
        />
        <IconButton
          aria-label="Toggle chat"
          icon={<Box as={ChatIcon} w={6} h={6} />}
          colorScheme={isOpen ? 'brand' : 'gray'}
          onClick={onOpen}
        />
        <IconButton
          aria-label="Record"
          icon={<Box as="span" w={3} h={3} borderRadius="full" bg={isRecording ? 'red.500' : 'gray.500'} />}
          colorScheme={isRecording ? 'red' : 'gray'}
          onClick={isRecording ? handleStopRecording : handleStartRecording}
        />
        <IconButton
          aria-label="Leave room"
          icon={<Box as={PhoneIcon} w={6} h={6} transform="rotate(135deg)" />}
          colorScheme="red"
          onClick={handleLeaveRoom}
        />
      </Flex>

      {/* Chat Drawer */}
      <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            <Tabs isFitted onChange={(index) => setActiveTab(index === 0 ? 'chat' : 'whiteboard')}>
              <TabList>
                <Tab>Chat</Tab>
                <Tab>Whiteboard</Tab>
              </TabList>
            </Tabs>
          </DrawerHeader>

          <DrawerBody p={0}>
            <TabPanels>
              {/* Chat Panel */}
              <TabPanel>
                <VStack h="full" spacing={4}>
                  <Box flex={1} w="full" overflowY="auto" p={4}>
                    {messages.map(message => (
                      <Box
                        key={message.id}
                        mb={4}
                        p={2}
                        bg={message.sender === user?.username ? 'brand.100' : 'gray.100'}
                        borderRadius="md"
                      >
                        <Text fontWeight="bold" fontSize="sm">{message.sender}</Text>
                        <Text>{message.content}</Text>
                        <Text fontSize="xs" color="gray.500">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </Text>
                      </Box>
                    ))}
                  </Box>
                  <HStack w="full" p={4} borderTop="1px" borderColor={borderColor}>
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage}>Send</Button>
                  </HStack>
                </VStack>
              </TabPanel>

              {/* Whiteboard Panel */}
              <TabPanel>
                <Box ref={whiteboardRef} w="full" h="full" bg="white">
                  {/* Add whiteboard implementation here */}
                </Box>
              </TabPanel>
            </TabPanels>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};

export default VideoRoom; 