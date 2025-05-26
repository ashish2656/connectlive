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
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'whiteboard'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket>();
  const mediaRecorderRef = useRef<MediaRecorder>();
  const whiteboardRef = useRef<any>(null);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  useEffect(() => {
    // Initialize WebRTC and Socket.io connections
    const initializeRoom = async () => {
      try {
        // Get user media
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Initialize socket connection
        // Add socket connection logic here

        // Initialize peer connections
        // Add peer connection logic here

      } catch (error) {
        console.error('Error accessing media devices:', error);
      }
    };

    initializeRoom();

    return () => {
      // Cleanup
      socketRef.current?.disconnect();
      if (localVideoRef.current?.srcObject) {
        const tracks = (localVideoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [roomId]);

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
      <Flex h="calc(100vh - 60px)" mt="60px">
        {/* Video Grid */}
        <MotionGrid
          flex={1}
          templateColumns="repeat(auto-fit, minmax(300px, 1fr))"
          gap={4}
          p={4}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Local Video */}
          <MotionBox
            position="relative"
            borderRadius="lg"
            overflow="hidden"
            variants={itemVariants}
          >
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <Text
              position="absolute"
              bottom={2}
              left={2}
              color="white"
              bg="blackAlpha.600"
              px={2}
              py={1}
              borderRadius="md"
              fontSize="sm"
            >
              You
            </Text>
          </MotionBox>

          {/* Participant Videos */}
          {participants.map(participant => (
            <MotionBox
              key={participant.id}
              position="relative"
              borderRadius="lg"
              overflow="hidden"
              variants={itemVariants}
            >
              {/* Add participant video here */}
              <Text
                position="absolute"
                bottom={2}
                left={2}
                color="white"
                bg="blackAlpha.600"
                px={2}
                py={1}
                borderRadius="md"
                fontSize="sm"
              >
                {participant.username}
              </Text>
            </MotionBox>
          ))}
        </MotionGrid>

        {/* Right Sidebar */}
        <Drawer
          isOpen={isOpen}
          placement="right"
          onClose={onClose}
          size="md"
        >
          <DrawerOverlay />
          <DrawerContent>
            <DrawerCloseButton />
            <DrawerHeader p={4}>
              <Tabs
                isFitted
                variant="enclosed"
                onChange={(index) => setActiveTab(['chat', 'participants', 'whiteboard'][index] as any)}
              >
                <TabList>
                  <Tab>Chat</Tab>
                  <Tab>Participants</Tab>
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

                {/* Participants Panel */}
                <TabPanel>
                  <List spacing={3}>
                    {participants.map(participant => (
                      <ListItem
                        key={participant.id}
                        p={2}
                        display="flex"
                        alignItems="center"
                        gap={3}
                      >
                        <Avatar size="sm" name={participant.username} />
                        <Text>{participant.username}</Text>
                        <HStack ml="auto">
                          {!participant.audioEnabled && (
                            <Badge colorScheme="red">Muted</Badge>
                          )}
                          {!participant.videoEnabled && (
                            <Badge colorScheme="red">Video Off</Badge>
                          )}
                        </HStack>
                      </ListItem>
                    ))}
                  </List>
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
          aria-label="Toggle whiteboard"
          icon={<Box as={PencilIcon} w={6} h={6} />}
          colorScheme={activeTab === 'whiteboard' ? 'brand' : 'gray'}
          onClick={() => {
            onOpen();
            setActiveTab('whiteboard');
          }}
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
    </Box>
  );
};

export default VideoRoom; 