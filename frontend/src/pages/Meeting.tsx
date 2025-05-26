import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Grid,
  Flex,
  Text,
  IconButton,
  HStack,
  VStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorModeValue,
  Button,
  Avatar,
  List,
  ListItem,
  Input,
  InputGroup,
  InputRightElement,
  Divider,
  Badge,
  Tooltip,
  useToast,
  useClipboard,
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  MicrophoneIcon,
  VideoCameraIcon,
  PhoneIcon,
  ChatBubbleLeftIcon as ChatIcon,
  UsersIcon,
  ShareIcon,
  HandRaisedIcon,
  FaceSmileIcon,
  XMarkIcon,
  PencilIcon,
  VideoCameraSlashIcon,
  SpeakerXMarkIcon as MicrophoneSlashIcon,
  ClipboardIcon,
} from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';
import Peer from 'simple-peer';
import { io, Socket } from 'socket.io-client';
import RecordRTC from 'recordrtc';

interface Participant {
  id: string;
  username: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  stream?: MediaStream;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
}

interface PeerConnection {
  peerId: string;
  peer: Peer.Instance;
}

const MotionBox = motion(Box);

// Update the constant to use Vite's environment variables
const SOCKET_SERVER = import.meta.env.VITE_SOCKET_SERVER_URL || 'http://localhost:5000';

const Meeting: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasCopied, onCopy } = useClipboard(meetingId || '');

  // State
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const whiteboardRef = useRef<HTMLCanvasElement>(null);
  const startTimeRef = useRef<Date>(new Date());
  const socketRef = useRef<Socket>();
  const peersRef = useRef<PeerConnection[]>([]);
  const streamRef = useRef<MediaStream>();
  const recorderRef = useRef<RecordRTC>();
  const canvasContextRef = useRef<CanvasRenderingContext2D | null>(null);

  // Theme
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Initialize WebRTC and Socket connection
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Connect to socket server with the environment-specific URL
        socketRef.current = io(SOCKET_SERVER, {
          withCredentials: true
        });
        
        // Join room
        socketRef.current.emit('join-room', { roomId: meetingId, userId: user?.id });

        // Handle new participant
        socketRef.current.on('user-joined', ({ userId, username }) => {
          const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
          });

          peer.on('signal', signal => {
            socketRef.current?.emit('sending-signal', { userToSignal: userId, signal });
          });

          peersRef.current.push({ peerId: userId, peer });
        });

        // Handle receiving returned signal
        socketRef.current.on('receiving-returned-signal', ({ signal, id }) => {
          const item = peersRef.current.find(p => p.peerId === id);
          item?.peer.signal(signal);
        });

        // Handle user disconnect
        socketRef.current.on('user-disconnected', userId => {
          const peerConnection = peersRef.current.find(p => p.peerId === userId);
          if (peerConnection) {
            peerConnection.peer.destroy();
            peersRef.current = peersRef.current.filter(p => p.peerId !== userId);
            setParticipants(prev => prev.filter(p => p.id !== userId));
          }
        });

      } catch (error) {
        console.error('Error accessing media devices:', error);
        toast({
          title: 'Error accessing camera/microphone',
          description: 'Please make sure you have granted permission to use media devices.',
          status: 'error',
          duration: 5000,
        });
      }
    };

    initializeMedia();

    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
      socketRef.current?.disconnect();
      peersRef.current.forEach(({ peer }) => peer.destroy());
    };
  }, [meetingId, user?.id]);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - startTimeRef.current.getTime();
      setElapsedTime(Math.floor(diff / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Initialize whiteboard
  useEffect(() => {
    if (whiteboardRef.current) {
      const canvas = whiteboardRef.current;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.strokeStyle = '#000000';
        context.lineWidth = 2;
        canvasContextRef.current = context;
      }
    }
  }, []);

  // Format elapsed time
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handlers
  const toggleAudio = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenStream.getVideoTracks()[0].onended = () => {
          if (streamRef.current && localVideoRef.current) {
            localVideoRef.current.srcObject = streamRef.current;
            setIsScreenSharing(false);
          }
        };

        setIsScreenSharing(true);
      } else {
        if (streamRef.current && localVideoRef.current) {
          localVideoRef.current.srcObject = streamRef.current;
        }
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
      toast({
        title: 'Error sharing screen',
        description: 'Unable to share screen. Please try again.',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      if (streamRef.current) {
        const recorder = new RecordRTC(streamRef.current, {
          type: 'video',
        });
        recorder.startRecording();
        recorderRef.current = recorder;
        setIsRecording(true);
      }
    } else {
      if (recorderRef.current) {
        recorderRef.current.stopRecording(() => {
          const blob = recorderRef.current?.getBlob();
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `recording-${new Date().toISOString()}.webm`;
            a.click();
          }
        });
        setIsRecording(false);
      }
    }
  };

  const toggleHandRaise = () => {
    setIsHandRaised(!isHandRaised);
    socketRef.current?.emit('hand-raised', { userId: user?.id, isRaised: !isHandRaised });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      senderId: user?.id || '',
      senderName: user?.username || '',
      content: newMessage,
      timestamp: new Date(),
    };

    socketRef.current?.emit('send-message', message);
    setMessages([...messages, message]);
    setNewMessage('');
  };

  const handleLeaveMeeting = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    socketRef.current?.disconnect();
    navigate('/');
  };

  // Whiteboard handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = whiteboardRef.current;
    const context = canvasContextRef.current;
    if (canvas && context) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      context.beginPath();
      context.moveTo(x, y);
      setIsDrawing(true);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasContextRef.current || !whiteboardRef.current) return;
    
    const canvas = whiteboardRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    canvasContextRef.current.lineTo(x, y);
    canvasContextRef.current.stroke();
  };

  const stopDrawing = () => {
    if (canvasContextRef.current) {
      canvasContextRef.current.closePath();
    }
    setIsDrawing(false);
  };

  return (
    <Flex h="100vh" bg={bgColor}>
      {/* Meeting Code Display */}
      <Box
        position="absolute"
        top={4}
        left={4}
        p={2}
        bg="blackAlpha.600"
        color="white"
        borderRadius="md"
        zIndex={10}
      >
        <HStack spacing={2}>
          <Text>Meeting Code: {meetingId}</Text>
          <IconButton
            aria-label="Copy meeting code"
            icon={<Box as={ClipboardIcon} w={4} h={4} />}
            size="sm"
            variant="ghost"
            color="white"
            onClick={onCopy}
          />
        </HStack>
        {hasCopied && (
          <Text fontSize="xs" color="green.200">
            Copied to clipboard!
          </Text>
        )}
      </Box>

      {/* Left Side - Video Grid */}
      <Box flex="1" p={4} borderRight="1px" borderColor={borderColor}>
        <Grid
          templateColumns="repeat(auto-fit, minmax(300px, 1fr))"
          gap={4}
          maxH="calc(100vh - 160px)"
          overflowY="auto"
          p={2}
        >
          {/* Local Video */}
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            position="relative"
            borderRadius="lg"
            overflow="hidden"
            bg="black"
          >
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
                <Text fontSize="sm">{user?.username} (You)</Text>
                <HStack spacing={1}>
                  {!isAudioEnabled && <MicrophoneSlashIcon width={16} />}
                  {!isVideoEnabled && <VideoCameraSlashIcon width={16} />}
                </HStack>
              </Flex>
            </Box>
          </MotionBox>

          {/* Other Participants */}
          {participants.map(participant => (
            <MotionBox
              key={participant.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              position="relative"
              borderRadius="lg"
              overflow="hidden"
              bg="black"
            >
              <video
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
                  <Text fontSize="sm">{participant.username}</Text>
                  <HStack spacing={1}>
                    {!participant.isAudioEnabled && <MicrophoneSlashIcon width={16} />}
                    {!participant.isVideoEnabled && <VideoCameraSlashIcon width={16} />}
                  </HStack>
                </Flex>
              </Box>
            </MotionBox>
          ))}
        </Grid>

        {/* Bottom Controls */}
        <Flex
          position="fixed"
          bottom={0}
          left={0}
          right={0}
          h="80px"
          bg={bgColor}
          borderTop="1px"
          borderColor={borderColor}
          px={4}
          align="center"
          justify="center"
          gap={4}
        >
          <Tooltip label={isAudioEnabled ? 'Mute' : 'Unmute'}>
            <IconButton
              aria-label="Toggle microphone"
              icon={isAudioEnabled ? <Box as={MicrophoneIcon} w={6} h={6} /> : <Box as={MicrophoneSlashIcon} w={6} h={6} />}
              colorScheme={isAudioEnabled ? 'gray' : 'red'}
              onClick={toggleAudio}
            />
          </Tooltip>
          <Tooltip label={isVideoEnabled ? 'Stop Video' : 'Start Video'}>
            <IconButton
              aria-label="Toggle camera"
              icon={isVideoEnabled ? <Box as={VideoCameraIcon} w={6} h={6} /> : <Box as={VideoCameraSlashIcon} w={6} h={6} />}
              colorScheme={isVideoEnabled ? 'gray' : 'red'}
              onClick={toggleVideo}
            />
          </Tooltip>
          <Tooltip label={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}>
            <IconButton
              aria-label="Share screen"
              icon={<Box as={ShareIcon} w={6} h={6} />}
              colorScheme={isScreenSharing ? 'brand' : 'gray'}
              onClick={toggleScreenShare}
            />
          </Tooltip>
          <Tooltip label={isRecording ? 'Stop Recording' : 'Start Recording'}>
            <IconButton
              aria-label="Record"
              icon={<Box as="span" w={3} h={3} borderRadius="full" bg={isRecording ? 'red.500' : 'gray.500'} />}
              colorScheme={isRecording ? 'red' : 'gray'}
              onClick={toggleRecording}
            />
          </Tooltip>
          <Tooltip label={isHandRaised ? 'Lower Hand' : 'Raise Hand'}>
            <IconButton
              aria-label="Raise hand"
              icon={<Box as={HandRaisedIcon} w={6} h={6} />}
              colorScheme={isHandRaised ? 'yellow' : 'gray'}
              onClick={toggleHandRaise}
            />
          </Tooltip>
          <Tooltip label="Leave Meeting">
            <IconButton
              aria-label="Leave meeting"
              icon={<Box as={PhoneIcon} w={6} h={6} transform="rotate(135deg)" />}
              colorScheme="red"
              onClick={handleLeaveMeeting}
            />
          </Tooltip>

          {/* Meeting Info */}
          <Box position="absolute" left={4}>
            <Text fontSize="sm" color="gray.500">
              {formatTime(elapsedTime)}
            </Text>
          </Box>
        </Flex>
      </Box>

      {/* Right Side - Tabs */}
      <Box w="350px" h="100vh" bg={bgColor}>
        <Tabs isFitted variant="enclosed">
          <TabList>
            <Tab><Box as={UsersIcon} w={5} h={5} /></Tab>
            <Tab><Box as={ChatIcon} w={5} h={5} /></Tab>
            <Tab><Box as={PencilIcon} w={5} h={5} /></Tab>
          </TabList>

          <TabPanels h="calc(100vh - 40px)" overflowY="auto">
            {/* Participants Panel */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <Text fontWeight="bold">Participants ({participants.length + 1})</Text>
                <List spacing={2}>
                  {/* Local User */}
                  <ListItem p={2} bg="gray.50" borderRadius="md">
                    <Flex align="center" gap={3}>
                      <Avatar size="sm" name={user?.username} />
                      <Box flex={1}>
                        <Text fontWeight="medium">{user?.username} (You)</Text>
                        <HStack spacing={1}>
                          {!isAudioEnabled && <Badge colorScheme="red">Muted</Badge>}
                          {!isVideoEnabled && <Badge colorScheme="red">Video Off</Badge>}
                          {isScreenSharing && <Badge colorScheme="green">Sharing</Badge>}
                          {isHandRaised && <Badge colorScheme="yellow">Hand Raised</Badge>}
                        </HStack>
                      </Box>
                    </Flex>
                  </ListItem>

                  {/* Other Participants */}
                  {participants.map(participant => (
                    <ListItem key={participant.id} p={2} bg="gray.50" borderRadius="md">
                      <Flex align="center" gap={3}>
                        <Avatar size="sm" name={participant.username} />
                        <Box flex={1}>
                          <Text fontWeight="medium">{participant.username}</Text>
                          <HStack spacing={1}>
                            {!participant.isAudioEnabled && <Badge colorScheme="red">Muted</Badge>}
                            {!participant.isVideoEnabled && <Badge colorScheme="red">Video Off</Badge>}
                            {participant.isScreenSharing && <Badge colorScheme="green">Sharing</Badge>}
                            {participant.isHandRaised && <Badge colorScheme="yellow">Hand Raised</Badge>}
                          </HStack>
                        </Box>
                      </Flex>
                    </ListItem>
                  ))}
                </List>
              </VStack>
            </TabPanel>

            {/* Chat Panel */}
            <TabPanel h="100%" display="flex" flexDirection="column">
              <VStack flex={1} spacing={4} align="stretch">
                <Box flex={1} overflowY="auto">
                  {messages.map(message => (
                    <Box
                      key={message.id}
                      mb={4}
                      p={2}
                      bg={message.senderId === user?.id ? 'brand.100' : 'gray.100'}
                      borderRadius="md"
                    >
                      <Text fontWeight="bold" fontSize="sm">{message.senderName}</Text>
                      <Text>{message.content}</Text>
                      <Text fontSize="xs" color="gray.500">
                        {message.timestamp.toLocaleTimeString()}
                      </Text>
                    </Box>
                  ))}
                </Box>
                <InputGroup size="md">
                  <Input
                    pr="4.5rem"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <InputRightElement width="4.5rem">
                    <Button h="1.75rem" size="sm" onClick={handleSendMessage}>
                      Send
                    </Button>
                  </InputRightElement>
                </InputGroup>
              </VStack>
            </TabPanel>

            {/* Tools Panel */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <Text fontWeight="bold">Tools</Text>
                <Box
                  border="2px"
                  borderColor={borderColor}
                  borderRadius="md"
                  h="400px"
                  position="relative"
                >
                  <canvas
                    ref={whiteboardRef}
                    style={{
                      width: '100%',
                      height: '100%',
                      cursor: 'crosshair',
                    }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                </Box>
                <Button
                  leftIcon={<Box as={ShareIcon} w={5} h={5} />}
                  width="100%"
                  onClick={toggleScreenShare}
                  colorScheme={isScreenSharing ? 'red' : 'gray'}
                >
                  {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                </Button>
                <Divider />
                <Text fontSize="sm" color="gray.500">More tools coming soon...</Text>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Flex>
  );
};

export default Meeting; 