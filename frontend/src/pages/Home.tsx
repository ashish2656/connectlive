import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  Heading,
  Text,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Input,
  VStack,
  HStack,
  Card,
  CardBody,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  useToast,
  useClipboard,
} from '@chakra-ui/react';
import { FormControl, FormLabel } from '@chakra-ui/form-control';
import { Switch } from '@chakra-ui/switch';
import { ChevronDownIcon, CopyIcon, AddIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useFriends } from '../context/FriendsContext';
import Layout from '../components/Layout';

// Default API URL if environment variable is not set
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

interface Room {
  _id: string;
  name: string;
  roomId: string;
  host: string;
  isPrivate: boolean;
  participants: string[];
}

const Home: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const { isOpen: isCreateRoomOpen, onOpen: onCreateRoomOpen, onClose: onCreateRoomClose } = useDisclosure();
  const { isOpen: isAddFriendOpen, onOpen: onAddFriendOpen, onClose: onAddFriendClose } = useDisclosure();
  const { user, token } = useAuth();
  const { friends } = useFriends();
  const navigate = useNavigate();
  const toast = useToast();
  const { onCopy } = useClipboard(user?.id || '');

  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allRooms = response.data;
      
      // Filter my rooms (where I'm the host)
      const hostRooms = allRooms.filter((room: Room) => room.host === user?.id);
      setMyRooms(hostRooms);
      
      // Filter other rooms (where I'm not the host)
      const otherRooms = allRooms.filter((room: Room) => room.host !== user?.id);
      setRooms(otherRooms);
      
      // Find current room (where I'm a participant)
      const participatingRoom = allRooms.find((room: Room) => 
        room.participants.includes(user?.id || '')
      );
      setCurrentRoom(participatingRoom || null);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRooms();
    }
  }, [token, user?.id]);

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      toast({
        title: 'Error',
        description: 'Room name is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/rooms`,
        { name: newRoomName, isPrivate },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onCreateRoomClose();
      setNewRoomName('');
      setIsPrivate(false);
      navigate(`/room/${response.data.room.roomId}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create room',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    try {
      await axios.post(
        `${API_URL}/api/rooms/${roomId}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/room/${roomId}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to join room',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleLeaveRoom = async (roomId: string) => {
    try {
      await axios.post(
        `${API_URL}/api/rooms/${roomId}/leave`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchRooms(); // Refresh the rooms list
      toast({
        title: 'Success',
        description: 'Left room successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to leave room',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleInviteFriend = async (roomId: string, friendId: string) => {
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

  const handleAddFriend = async () => {
    if (!friendCode.trim()) {
      toast({
        title: 'Error',
        description: 'Friend code is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/friends/request`,
        { userId: friendCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({
        title: 'Success',
        description: 'Friend request sent successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onAddFriendClose();
      setFriendCode('');
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

  return (
    <Layout>
      <Container maxW="container.xl">
        <VStack spacing={8} align="stretch">
          {/* Currently Joined Room Section */}
          {currentRoom && (
            <Box>
              <HStack justify="space-between" mb={4}>
                <Heading size="lg">Currently Joined Room</Heading>
                <HStack>
                  {currentRoom.host === user?.id && (
                    <Menu>
                      <MenuButton
                        as={Button}
                        rightIcon={<ChevronDownIcon />}
                        colorScheme="brand"
                      >
                        Invite Friends
                      </MenuButton>
                      <MenuList>
                        {friends.length > 0 ? (
                          friends.map((friend) => (
                            <MenuItem
                              key={friend._id}
                              onClick={() => handleInviteFriend(currentRoom.roomId, friend._id)}
                            >
                              {friend.username}
                            </MenuItem>
                          ))
                        ) : (
                          <MenuItem isDisabled>No friends to invite</MenuItem>
                        )}
                      </MenuList>
                    </Menu>
                  )}
                  <Button
                    colorScheme="red"
                    variant="outline"
                    onClick={() => handleLeaveRoom(currentRoom.roomId)}
                  >
                    Leave Room
                  </Button>
                </HStack>
              </HStack>
              <Card>
                <CardBody>
                  <VStack align="start" spacing={2}>
                    <Heading size="md">{currentRoom.name}</Heading>
                    <Text color="gray.600">
                      Host: {currentRoom.host === user?.id ? 'You' : 'Someone else'}
                    </Text>
                    <Text color="gray.600">
                      Participants: {currentRoom.participants.length}
                    </Text>
                    {currentRoom.isPrivate && (
                      <Text color="orange.500">Private Room</Text>
                    )}
                    <Button
                      colorScheme="brand"
                      onClick={() => navigate(`/room/${currentRoom.roomId}`)}
                    >
                      Rejoin Room
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </Box>
          )}

          {/* My Rooms Section */}
          <Box>
            <HStack justify="space-between" mb={4}>
              <Heading size="lg">My Rooms</Heading>
              <HStack>
                <Button leftIcon={<AddIcon />} onClick={onAddFriendOpen}>
                  Add Friend
                </Button>
                <Button colorScheme="brand" onClick={onCreateRoomOpen}>
                  Create New Room
                </Button>
              </HStack>
            </HStack>
            <Grid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={6}>
              {myRooms.map((room) => (
                <Card key={room._id}>
                  <CardBody>
                    <VStack align="start" spacing={2}>
                      <Heading size="md">{room.name}</Heading>
                      <Text color="gray.600">
                        Participants: {room.participants.length}
                      </Text>
                      {room.isPrivate && (
                        <Text color="orange.500">Private Room</Text>
                      )}
                      <HStack width="full">
                        <Button
                          colorScheme="brand"
                          flex={1}
                          onClick={() => handleJoinRoom(room.roomId)}
                        >
                          Join Room
                        </Button>
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            icon={<ChevronDownIcon />}
                            variant="outline"
                          />
                          <MenuList>
                            {friends.length > 0 ? (
                              friends.map((friend) => (
                                <MenuItem
                                  key={friend._id}
                                  onClick={() => handleInviteFriend(room.roomId, friend._id)}
                                >
                                  {friend.username}
                                </MenuItem>
                              ))
                            ) : (
                              <MenuItem isDisabled>No friends to invite</MenuItem>
                            )}
                          </MenuList>
                        </Menu>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </Grid>
            {myRooms.length === 0 && (
              <Text color="gray.600">You haven't created any rooms yet.</Text>
            )}
          </Box>

          <Divider />

          {/* Available Rooms Section */}
          <Box>
            <Heading size="lg" mb={4}>Available Rooms</Heading>
            <Grid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={6}>
              {rooms.map((room) => (
                <Card key={room._id}>
                  <CardBody>
                    <VStack align="start" spacing={2}>
                      <Heading size="md">{room.name}</Heading>
                      <Text color="gray.600">
                        Participants: {room.participants.length}
                      </Text>
                      {room.isPrivate && (
                        <Text color="orange.500">Private Room</Text>
                      )}
                      <Button
                        colorScheme="brand"
                        width="full"
                        onClick={() => handleJoinRoom(room.roomId)}
                      >
                        Join Room
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </Grid>
            {rooms.length === 0 && (
              <Text color="gray.600">No available rooms to join.</Text>
            )}
          </Box>
        </VStack>

        {/* Create Room Modal */}
        <Modal isOpen={isCreateRoomOpen} onClose={onCreateRoomClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Create New Room</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Room Name</FormLabel>
                  <Input
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Enter room name"
                  />
                </FormControl>
                <FormControl display="flex" alignItems="center">
                  <FormLabel mb={0}>Private Room</FormLabel>
                  <Switch
                    isChecked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                  />
                </FormControl>
                <Button
                  colorScheme="brand"
                  width="full"
                  onClick={handleCreateRoom}
                  isLoading={isLoading}
                >
                  Create Room
                </Button>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>

        {/* Add Friend Modal */}
        <Modal isOpen={isAddFriendOpen} onClose={onAddFriendClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Add Friend</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4}>
                <Box width="full">
                  <Text mb={2}>Your Friend Code:</Text>
                  <HStack>
                    <Input value={user?.id} isReadOnly />
                    <IconButton
                      aria-label="Copy friend code"
                      icon={<CopyIcon />}
                      onClick={onCopy}
                    />
                  </HStack>
                </Box>
                <FormControl isRequired>
                  <FormLabel>Friend's Code</FormLabel>
                  <Input
                    value={friendCode}
                    onChange={(e) => setFriendCode(e.target.value)}
                    placeholder="Enter friend's code"
                  />
                </FormControl>
                <Button
                  colorScheme="brand"
                  width="full"
                  onClick={handleAddFriend}
                >
                  Send Friend Request
                </Button>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Container>
    </Layout>
  );
};

export default Home; 