import React, { useState, useEffect } from 'react';
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
import API_ENDPOINTS from '../config/api';
import axios from 'axios';
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
import {
  selectPeers,
  selectIsConnectedToRoom,
  useHMSStore,
  useHMSActions,
  selectLocalPeer,
  selectIsLocalAudioEnabled,
  selectIsLocalVideoEnabled,
  selectLocalPeerRole,
  HMSPeer,
  useAVToggle,
  selectPeerByID,
} from '@100mslive/react-sdk';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
}

const Meeting: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasCopied, onCopy } = useClipboard(meetingId || '');

  // 100ms hooks
  const hmsActions = useHMSActions();
  const peers = useHMSStore(selectPeers);
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const localPeer = useHMSStore(selectLocalPeer);
  const { isLocalAudioEnabled, isLocalVideoEnabled, toggleAudio: toggleAudioState, toggleVideo: toggleVideoState } = useAVToggle();
  const role = useHMSStore(selectLocalPeerRole);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Theme
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Initialize 100ms
  useEffect(() => {
    const initializeHMS = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get authentication token from your backend
        const response = await axios.post(API_ENDPOINTS.token.get, {
          userId: user?.id,
          role: 'participant', // or any other role you've configured
          roomId: meetingId,
        });

        const { token } = response.data;

        // Join the room
        await hmsActions.join({
          authToken: token,
          userName: user?.username || 'Guest',
          settings: {
            isAudioMuted: false,
            isVideoMuted: false,
          },
        });

        setIsLoading(false);
      } catch (err) {
        console.error('Error joining room:', err);
        setError(err instanceof Error ? err.message : 'Failed to join meeting');
        setIsLoading(false);
        toast({
          title: 'Error',
          description: 'Failed to join meeting. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    };

    initializeHMS();

    return () => {
      hmsActions.leave();
    };
  }, [meetingId, user?.id, user?.username, hmsActions]);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format elapsed time
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handlers
  const handleToggleAudio = async () => {
    try {
      await toggleAudioState();
    } catch (err) {
      console.error('Error toggling audio:', err);
      toast({
        title: 'Error',
        description: 'Failed to toggle audio. Please try again.',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleToggleVideo = async () => {
    try {
      await toggleVideoState();
    } catch (err) {
      console.error('Error toggling video:', err);
      toast({
        title: 'Error',
        description: 'Failed to toggle video. Please try again.',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleToggleScreenShare = async () => {
    try {
      await hmsActions.setScreenShareEnabled(!isScreenSharing);
      setIsScreenSharing(!isScreenSharing);
    } catch (err) {
      console.error('Error toggling screen share:', err);
      toast({
        title: 'Error',
        description: 'Failed to toggle screen share. Please try again.',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const toggleHandRaise = async () => {
    try {
      const metadata = localPeer?.metadata ? JSON.parse(localPeer.metadata) : {};
      await hmsActions.changeMetadata({
        ...metadata,
        isHandRaised: !isHandRaised
      });
      setIsHandRaised(!isHandRaised);
    } catch (err) {
      console.error('Error toggling hand raise:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await hmsActions.sendBroadcastMessage(newMessage);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        senderId: localPeer?.id || '',
        senderName: localPeer?.name || '',
        content: newMessage,
        timestamp: new Date(),
      }]);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleLeaveMeeting = async () => {
    try {
      await hmsActions.leave();
      navigate('/');
    } catch (err) {
      console.error('Error leaving meeting:', err);
    }
  };

  // Update track selectors
  const getPeerAudioEnabled = (peerId: string) => {
    const peer = useHMSStore(selectPeerByID(peerId));
    return peer?.audioTrack?.enabled ?? false;
  };

  const getPeerVideoEnabled = (peerId: string) => {
    const peer = useHMSStore(selectPeerByID(peerId));
    return peer?.videoTrack?.enabled ?? false;
  };

  const getPeerScreenShareEnabled = (peerId: string) => {
    const peer = useHMSStore(selectPeerByID(peerId));
    return peer?.auxiliaryTracks?.some(track => track.enabled && track.source === 'screen') ?? false;
  };

  // Loading state
  if (isLoading) {
    return (
      <Flex justify="center" align="center" h="100vh" direction="column" gap={4}>
        <Spinner size="xl" color="blue.500" thickness="4px" />
        <Text fontSize="xl">Joining meeting...</Text>
        {error && (
          <Box textAlign="center" mt={4}>
            <Text color="red.500" fontSize="md">{error}</Text>
            <Button mt={4} colorScheme="blue" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </Box>
        )}
      </Flex>
    );
  }

  return (
    <Flex h="100vh" bg={bgColor} direction="column">
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
            {peers.map(peer => (
              <Box
                key={peer.id}
                position="relative"
                borderRadius="lg"
                overflow="hidden"
                bg="black"
              >
                <video
                  ref={videoRef => {
                    if (videoRef && peer.videoTrack) {
                      hmsActions.attachVideo(peer.videoTrack, videoRef);
                    }
                  }}
                  autoPlay
                  muted={peer.isLocal}
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
                    <Text fontSize="sm">{peer.name} {peer.isLocal ? '(You)' : ''}</Text>
                    <HStack spacing={1}>
                      {!isLocalAudioEnabled && <MicrophoneSlashIcon width={16} />}
                      {!isLocalVideoEnabled && <VideoCameraSlashIcon width={16} />}
                    </HStack>
                  </Flex>
                </Box>
              </Box>
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
            <Tooltip label={isLocalAudioEnabled ? 'Mute' : 'Unmute'}>
              <IconButton
                aria-label="Toggle microphone"
                icon={isLocalAudioEnabled ? <Box as={MicrophoneIcon} w={6} h={6} /> : <Box as={MicrophoneSlashIcon} w={6} h={6} />}
                colorScheme={isLocalAudioEnabled ? 'gray' : 'red'}
                onClick={handleToggleAudio}
              />
            </Tooltip>
            <Tooltip label={isLocalVideoEnabled ? 'Stop Video' : 'Start Video'}>
              <IconButton
                aria-label="Toggle camera"
                icon={isLocalVideoEnabled ? <Box as={VideoCameraIcon} w={6} h={6} /> : <Box as={VideoCameraSlashIcon} w={6} h={6} />}
                colorScheme={isLocalVideoEnabled ? 'gray' : 'red'}
                onClick={handleToggleVideo}
              />
            </Tooltip>
            <Tooltip label={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}>
              <IconButton
                aria-label="Share screen"
                icon={<Box as={ShareIcon} w={6} h={6} />}
                colorScheme={isScreenSharing ? 'brand' : 'gray'}
                onClick={handleToggleScreenShare}
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
            </TabList>

            <TabPanels h="calc(100vh - 40px)" overflowY="auto">
              {/* Participants Panel */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Text fontWeight="bold">Participants ({peers.length})</Text>
                  <List spacing={2}>
                    {peers.map(peer => (
                      <ListItem key={peer.id} p={2} bg="gray.50" borderRadius="md">
                        <Flex align="center" gap={3}>
                          <Avatar size="sm" name={peer.name} />
                          <Box flex={1}>
                            <Text fontWeight="medium">{peer.name} {peer.isLocal ? '(You)' : ''}</Text>
                            <HStack spacing={1}>
                              {!getPeerAudioEnabled(peer.id) && <Badge colorScheme="red">Muted</Badge>}
                              {!getPeerVideoEnabled(peer.id) && <Badge colorScheme="red">Video Off</Badge>}
                              {getPeerScreenShareEnabled(peer.id) && (
                                <Badge colorScheme="green">Sharing</Badge>
                              )}
                              {peer.metadata && JSON.parse(peer.metadata).isHandRaised && (
                                <Badge colorScheme="yellow">Hand Raised</Badge>
                              )}
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
                        bg={message.senderId === localPeer?.id ? 'brand.100' : 'gray.100'}
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
            </TabPanels>
          </Tabs>
        </Box>
      </Flex>
    </Flex>
  );
};

export default Meeting; 