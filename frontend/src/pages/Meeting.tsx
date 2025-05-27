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
  Spinner,
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

interface User {
  id: string;
  username: string;
  email: string;
}

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

// Add interface for room users
interface RoomUser {
  userId: string;
  username: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
}

// Add proper type for Peer options
interface PeerOptions {
  initiator: boolean;
  trickle: boolean;
  stream?: MediaStream;
  config: RTCConfiguration;
  objectMode: boolean;
  sdpTransform: (sdp: string) => string;
}

// Update SignalData interface
type SignalData = string | {
  type: 'offer' | 'answer' | 'candidate';
  sdp?: string;
  candidate?: RTCIceCandidateInit;
};

interface PeerSignalEvent {
  signal: Peer.SignalData;
  id: string;
}

const MotionBox = motion(Box);

// Update the constant to use Vite's environment variables
const SOCKET_SERVER = import.meta.env.VITE_SOCKET_SERVER_URL || 'https://connectlive-backend.onrender.com';

const configuration = {
  iceServers: [
    {
      urls: [
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
    {
      urls: [
        'turn:turn.connectlive.com:3478',
        'turn:turn.connectlive.com:5349'
      ],
      username: 'connectlive',
      credential: 'your_turn_secret'  // Replace with actual TURN credentials
    }
  ],
  iceCandidatePoolSize: 10,
};

// Update the media constraints
const getMediaConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
};

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

  // Add loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStreamLoading, setIsStreamLoading] = useState(true);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Add debug logging for loading states
  useEffect(() => {
    console.log('Loading states:', {
      isLoading,
      isStreamLoading,
      isVideoLoading,
      error,
      streamError
    });
  }, [isLoading, isStreamLoading, isVideoLoading, error, streamError]);

  // Add this function to ensure stream is ready
  const ensureStreamIsReady = async () => {
    if (!streamRef.current) {
      console.log('Stream not initialized, attempting to get local stream...');
      try {
        const stream = await getLocalStream();
        streamRef.current = stream;
        if (localVideoRef.current) {
          await initializeLocalVideo(stream);
        }
        return stream;
      } catch (err) {
        console.error('Failed to get local stream:', err);
        throw err;
      }
    }
    return streamRef.current;
  };

  // Update createPeer function
  const createPeer = async (initiator: boolean, userId: string): Promise<Peer.Instance> => {
    console.log(`Creating ${initiator ? 'initiator' : 'receiver'} peer for user:`, userId);
    
    try {
      const stream = await ensureStreamIsReady();
      
      const peerOptions: PeerOptions = {
        initiator,
        trickle: true,
        stream,
        config: configuration,
        objectMode: true,
        sdpTransform: (sdp: string) => {
          console.log('SDP before transform:', sdp);
          return sdp;
        }
      };

      const peer = new Peer(peerOptions);

      // Add event listeners
      peer.on('signal', (data: Peer.SignalData) => {
        console.log('Peer signaling:', { type: typeof data === 'string' ? 'string' : data.type, userId });
        socketRef.current?.emit('peer-signal', {
          userToSignal: userId,
          callerId: user?.id,
          signal: data
        });
      });

      peer.on('connect', () => {
        console.log('Peer connection established:', userId);
      });

      peer.on('error', err => {
        console.error('Peer connection error:', err);
        toast({
          title: 'Connection Error',
          description: `Connection error with peer: ${err.message}`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      });

      peer.on('close', () => {
        console.log('Peer connection closed:', userId);
        setParticipants(prev => prev.filter(p => p.id !== userId));
      });

      peer.on('stream', remoteStream => {
        console.log('Received stream from peer:', userId);
        console.log('Remote stream tracks:', {
          audio: remoteStream.getAudioTracks().length,
          video: remoteStream.getVideoTracks().length
        });

        setParticipants(prev => {
          const participantIndex = prev.findIndex(p => p.id === userId);
          if (participantIndex !== -1) {
            const updatedParticipants = [...prev];
            updatedParticipants[participantIndex] = {
              ...updatedParticipants[participantIndex],
              stream: remoteStream
            };
            return updatedParticipants;
          }
          return prev;
        });
      });

      return peer;
    } catch (err) {
      console.error('Error creating peer:', err);
      throw err;
    }
  };

  // Update the media stream initialization
  const initializeLocalVideo = async (stream: MediaStream) => {
    const videoElement = localVideoRef.current;
    if (!videoElement) {
      throw new Error('Video element not found');
    }

    try {
      setIsVideoLoading(true);
      videoElement.srcObject = stream;
      
      // Add event listeners for video loading
      videoElement.onloadedmetadata = async () => {
        try {
          await videoElement.play();
          console.log('Local video stream playing successfully');
          setIsVideoLoading(false);
        } catch (err) {
          console.error('Error playing video:', err);
          setStreamError('Failed to play video stream. Please check your camera permissions.');
          setIsVideoLoading(false);
        }
      };

      videoElement.onerror = (e) => {
        console.error('Video element error:', e);
        setStreamError('Error loading video stream. Please refresh the page.');
        setIsVideoLoading(false);
      };

    } catch (err) {
      console.error('Error setting up local video:', err);
      setStreamError('Failed to initialize video. Please check your camera permissions.');
      setIsVideoLoading(false);
      throw err;
    }
  };

  // Update the getLocalStream function
  const getLocalStream = async () => {
    try {
      setIsStreamLoading(true);
      setStreamError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints);
      console.log('Got local stream:', {
        id: stream.id,
        audioTracks: stream.getAudioTracks().map(track => ({
          enabled: track.enabled,
          muted: track.muted,
          id: track.id,
          label: track.label
        })),
        videoTracks: stream.getVideoTracks().map(track => ({
          enabled: track.enabled,
          muted: track.muted,
          id: track.id,
          label: track.label
        }))
      });

      // Verify that we have both audio and video tracks
      if (stream.getVideoTracks().length === 0) {
        throw new Error('No video track available. Please check your camera.');
      }
      if (stream.getAudioTracks().length === 0) {
        throw new Error('No audio track available. Please check your microphone.');
      }

      setIsStreamLoading(false);
      return stream;
    } catch (err) {
      console.error('Error getting local stream:', err);
      setStreamError(err instanceof Error ? err.message : 'Failed to access camera/microphone');
      setIsStreamLoading(false);
      toast({
        title: 'Media Error',
        description: `Failed to access camera/microphone: ${err instanceof Error ? err.message : 'Unknown error'}. Please check your permissions.`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      throw err;
    }
  };

  // Update initializeMedia function with better error handling and timeouts
  const initializeMedia = async () => {
    console.log('Starting media initialization...');
    try {
      setIsLoading(true);
      setError(null);

      // Add timeout for media initialization
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Media initialization timed out')), 30000);
      });

      // Race between media initialization and timeout
      await Promise.race([
        (async () => {
          console.log('Requesting media permissions...');
          let stream;
          for (let i = 0; i < 3; i++) {
            try {
              stream = await getLocalStream();
              console.log('Successfully got local stream on attempt', i + 1);
              break;
            } catch (err) {
              console.error(`Attempt ${i + 1} failed:`, err);
              if (i === 2) throw err;
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          if (!stream) {
            throw new Error('Failed to get local stream after 3 attempts');
          }

          streamRef.current = stream;
          
          if (localVideoRef.current) {
            console.log('Initializing local video...');
            await initializeLocalVideo(stream);
            console.log('Local video initialized successfully');
          }

          // Connect to socket server
          console.log('Connecting to socket server:', SOCKET_SERVER);
          socketRef.current = io(SOCKET_SERVER, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 20000,
            forceNew: true
          });

          // Add socket connection logging
          socketRef.current.on('connect', () => {
            console.log('Socket connected successfully:', socketRef.current?.id);
            setIsLoading(false);
          });

          socketRef.current.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            throw new Error(`Failed to connect to meeting server: ${error.message}`);
          });

          socketRef.current.on('user-joined', async ({ userId, username, socketId }: { userId: string; username: string; socketId: string }) => {
            console.log('User joined:', userId, username, socketId);
            
            try {
              const peer = await createPeer(true, socketId);
              peersRef.current.push({
                peerId: userId,
                peer
              });
            } catch (err) {
              console.error('Error in user-joined handler:', err);
            }
          });

          socketRef.current.on('room-users', (users: RoomUser[]) => {
            console.log('Room users:', users);
            // Filter out the current user from the participants list
            const otherUsers = users.filter(roomUser => roomUser.userId !== user?.id);
            setParticipants(otherUsers.map(roomUser => ({
              id: roomUser.userId,
              username: roomUser.username || 'Anonymous',
              isAudioEnabled: roomUser.isAudioEnabled,
              isVideoEnabled: roomUser.isVideoEnabled,
              isScreenSharing: roomUser.isScreenSharing,
              isHandRaised: roomUser.isHandRaised
            })));
          });

          socketRef.current.on('user-disconnected', (userId: string) => {
            console.log('User disconnected:', userId);
            setParticipants(prev => prev.filter(p => p.id !== userId));
          });

          socketRef.current.on('user-media-toggle', ({ userId, type, enabled }) => {
            setParticipants(prev => prev.map(p => {
              if (p.id === userId) {
                return {
                  ...p,
                  isAudioEnabled: type === 'audio' ? enabled : p.isAudioEnabled,
                  isVideoEnabled: type === 'video' ? enabled : p.isVideoEnabled
                };
              }
              return p;
            }));
          });

          socketRef.current.on('user-screen-share', ({ userId, isSharing }) => {
            setParticipants(prev => prev.map(p => {
              if (p.id === userId) {
                return { ...p, isScreenSharing: isSharing };
              }
              return p;
            }));
          });

          socketRef.current.on('user-hand-raised', ({ userId, isRaised }) => {
            setParticipants(prev => prev.map(p => {
              if (p.id === userId) {
                return { ...p, isHandRaised: isRaised };
              }
              return p;
            }));
          });

          socketRef.current.on('peer-signal', ({ signal, callerId }) => {
            const item = peersRef.current.find(p => p.peerId === callerId);
            if (item) {
              item.peer.signal(signal);
            }
          });

          socketRef.current.on('receive-signal', async ({ signal, id }: PeerSignalEvent) => {
            console.log('Received signal from:', id);
            
            try {
              let existingPeer = peersRef.current.find(p => p.peerId === id)?.peer;
              
              if (!existingPeer) {
                const newPeer = await createPeer(false, id);
                peersRef.current.push({
                  peerId: id,
                  peer: newPeer
                });
                existingPeer = newPeer;
              }

              existingPeer.signal(signal);
            } catch (err) {
              console.error('Error in receive-signal handler:', err);
            }
          });

          // Add chat message socket events
          socketRef.current.on('chat-message', (message: ChatMessage) => {
            console.log('Received chat message:', message);
            setMessages(prev => [...prev, message]);
          });

        })(),
        timeoutPromise
      ]);

    } catch (error) {
      console.error('Error in initializeMedia:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      setIsLoading(false);
      setIsStreamLoading(false);
      setIsVideoLoading(false);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to initialize meeting',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Call initializeMedia in useEffect
  useEffect(() => {
    console.log('Meeting component mounted');
    initializeMedia();

    return () => {
      console.log('Cleaning up media and socket connections...');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          console.log('Stopping track:', track.kind);
          track.stop();
        });
      }
      if (socketRef.current?.connected) {
        console.log('Disconnecting socket');
        socketRef.current.disconnect();
      }
      peersRef.current.forEach(({ peer }) => {
        console.log('Destroying peer connection');
        peer.destroy();
      });
    };
  }, [meetingId, user?.id, user?.username]);

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
      socketRef.current?.emit('toggle-media', {
        userId: user?.id,
        roomId: meetingId,
        type: 'audio',
        enabled: !isAudioEnabled
      });
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
      socketRef.current?.emit('toggle-media', {
        userId: user?.id,
        roomId: meetingId,
        type: 'video',
        enabled: !isVideoEnabled
      });
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
    socketRef.current?.emit('hand-raised', {
      userId: user?.id,
      roomId: meetingId,
      isRaised: !isHandRaised
    });
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

    socketRef.current?.emit('chat-message', {
      ...message,
      roomId: meetingId
    });
    
    setMessages(prev => [...prev, message]);
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
    <Flex h="100vh" bg={bgColor} direction="column">
      {/* Loading States */}
      {(isLoading || isStreamLoading || isVideoLoading) && (
        <Flex justify="center" align="center" flex={1} direction="column" gap={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <VStack spacing={2}>
            <Text fontSize="xl">
              {isLoading ? 'Initializing meeting...' :
               isStreamLoading ? 'Accessing camera and microphone...' :
               isVideoLoading ? 'Setting up video stream...' : 'Loading...'}
            </Text>
            <Text fontSize="sm" color="gray.500">
              This may take a few moments...
            </Text>
          </VStack>
          {(error || streamError) && (
            <Box textAlign="center" mt={4}>
              <Text color="red.500" fontSize="md">{error || streamError}</Text>
              <HStack spacing={4} mt={4}>
                <Button 
                  colorScheme="blue" 
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/')}
                >
                  Return Home
                </Button>
              </HStack>
            </Box>
          )}
        </Flex>
      )}

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

      {/* Main Meeting Layout */}
      <Flex flex={1}>
        {/* Left Side - Video Grid */}
        <Box flex={1} p={4} borderRight="1px" borderColor={borderColor}>
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
                  key={`${participant.id}-video`}
                  autoPlay
                  playsInline
                  muted={false}
                  ref={video => {
                    if (video && participant.stream) {
                      video.srcObject = null; // Clear any existing source
                      video.srcObject = participant.stream;
                      video.onloadedmetadata = async () => {
                        try {
                          console.log(`Remote video loaded for: ${participant.username}`);
                          await video.play();
                          console.log(`Remote video playing for: ${participant.username}`);
                        } catch (err) {
                          console.error(`Error playing remote video for ${participant.username}:`, err);
                          toast({
                            title: 'Video Playback Error',
                            description: `Failed to play video for ${participant.username}. Please try refreshing.`,
                            status: 'error',
                            duration: 5000,
                            isClosable: true,
                          });
                        }
                      };
                      video.onerror = (err) => {
                        console.error(`Video error for ${participant.username}:`, err);
                      };
                    }
                  }}
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
        <Box w="350px" h="100%" bg={bgColor}>
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
    </Flex>
  );
};

export default Meeting; 