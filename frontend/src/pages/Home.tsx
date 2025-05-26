import React, { useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Input,
  FormControl,
  FormLabel,
  useToast,
  Center,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

const Home: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen: isJoinOpen, onOpen: onJoinOpen, onClose: onJoinClose } = useDisclosure();
  const [meetingCode, setMeetingCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleCreateMeeting = () => {
    const meetingId = uuidv4().substring(0, 8); // Create a shorter meeting ID
    navigate(`/meeting/${meetingId}`);
  };

  const handleJoinMeeting = () => {
    if (!meetingCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a meeting code',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    // Navigate to the meeting room with the provided code
    navigate(`/meeting/${meetingCode.trim()}`);
    setIsLoading(false);
    onJoinClose();
  };

  return (
    <Layout>
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="stretch">
          <Box textAlign="center" py={10}>
            <Heading size="xl" mb={4}>Welcome, {user?.username}!</Heading>
            <Text fontSize="lg" color="gray.500" mb={8}>
              Start or join a meeting with just a click
            </Text>

            <Center>
              <VStack spacing={4} width="100%" maxW="400px">
                <Button
                  colorScheme="brand"
                  size="lg"
                  width="100%"
                  height="60px"
                  onClick={handleCreateMeeting}
                >
                  Create New Meeting
                </Button>

                <HStack width="100%">
                  <Divider />
                  <Text px={4} color="gray.500">or</Text>
                  <Divider />
                </HStack>

                <Button
                  variant="outline"
                  colorScheme="brand"
                  size="lg"
                  width="100%"
                  height="60px"
                  onClick={onJoinOpen}
                >
                  Join with Code
                </Button>
              </VStack>
            </Center>
          </Box>
        </VStack>
      </Container>

      {/* Join Meeting Modal */}
      <Modal isOpen={isJoinOpen} onClose={onJoinClose}>
        <ModalOverlay />
        <ModalContent bg={bgColor}>
          <ModalHeader>Join Meeting</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <FormControl>
              <FormLabel>Meeting Code</FormLabel>
              <Input
                placeholder="Enter meeting code"
                value={meetingCode}
                onChange={(e) => setMeetingCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinMeeting()}
              />
            </FormControl>

            <Button
              colorScheme="brand"
              width="100%"
              mt={4}
              onClick={handleJoinMeeting}
              isLoading={isLoading}
            >
              Join Meeting
            </Button>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Layout>
  );
};

export default Home; 