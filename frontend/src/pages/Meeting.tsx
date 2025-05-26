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
} from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';

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

const MotionBox = motion(Box);

const Meeting: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

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

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const whiteboardRef = useRef<HTMLCanvasElement>(null);
  const startTimeRef = useRef<Date>(new Date());

  // Theme
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - startTimeRef.current.getTime();
      setElapsedTime(Math.floor(diff / 1000));
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
  const toggleAudio = () => setIsAudioEnabled(!isAudioEnabled);
  const toggleVideo = () => setIsVideoEnabled(!isVideoEnabled);
  const toggleScreenShare = () => setIsScreenSharing(!isScreenSharing);
  const toggleRecording = () => setIsRecording(!isRecording);
  const toggleHandRaise = () => setIsHandRaised(!isHandRaised);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      senderId: user?.id || '',
      senderName: user?.username || '',
      content: newMessage,
      timestamp: new Date(),
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  const handleLeaveMeeting = () => {
    // Cleanup and navigate
    navigate('/');
  };

  return (
    <Flex h="100vh" bg={bgColor}>
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
                <Button leftIcon={<Box as={PencilIcon} w={5} h={5} />} width="100%">
                  Whiteboard
                </Button>
                <Button leftIcon={<Box as={ShareIcon} w={5} h={5} />} width="100%">
                  Share Screen
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