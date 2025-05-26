import React from 'react';
import {
  Box,
  Container,
  Flex,
  HStack,
  IconButton,
  useColorMode,
  useColorModeValue,
  Button,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  Divider,
} from '@chakra-ui/react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SunIcon, MoonIcon } from '@chakra-ui/icons';
import { useAuth } from '../context/AuthContext';

// Wrap ChakraUI components with Framer Motion
const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colorMode, toggleColorMode } = useColorMode();
  const { user, logout } = useAuth();
  const location = useLocation();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/friends', label: 'Friends' },
    { path: '/profile', label: 'Profile' },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
      <MotionFlex
        as="nav"
        position="fixed"
        top={0}
        width="full"
        zIndex={10}
        bg={bgColor}
        borderBottom="1px"
        borderColor={borderColor}
        px={4}
        py={2}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Container maxW="container.xl">
          <Flex justify="space-between" align="center">
            <HStack spacing={8}>
              <MotionBox
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link to="/">
                  <Text
                    fontSize="xl"
                    fontWeight="bold"
                    bgGradient="linear(to-r, brand.500, brand.600)"
                    bgClip="text"
                  >
                    ConnectLive
                  </Text>
                </Link>
              </MotionBox>

              <HStack spacing={4}>
                {navItems.map((item) => (
                  <MotionBox
                    key={item.path}
                    whileHover={{ y: -2 }}
                    whileTap={{ y: 0 }}
                  >
                    <Link to={item.path}>
                      <Button
                        variant="ghost"
                        colorScheme="brand"
                        isActive={location.pathname === item.path}
                      >
                        {item.label}
                      </Button>
                    </Link>
                  </MotionBox>
                ))}
              </HStack>
            </HStack>

            <HStack spacing={4}>
              <IconButton
                aria-label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}
                icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
                onClick={toggleColorMode}
                variant="ghost"
              />

              {user && (
                <Menu>
                  <MenuButton>
                    <Avatar
                      size="sm"
                      name={user.username}
                      src=""
                      cursor="pointer"
                    />
                  </MenuButton>
                  <MenuList>
                    <MenuItem as={Link} to="/profile">
                      Profile
                    </MenuItem>
                    <MenuItem as={Link} to="/settings">
                      Settings
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={handleLogout} color="red.500">
                      Logout
                    </MenuItem>
                  </MenuList>
                </Menu>
              )}
            </HStack>
          </Flex>
        </Container>
      </MotionFlex>

      <Box as="main" pt="70px">
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {children}
        </MotionBox>
      </Box>
    </Box>
  );
};

export default Layout; 