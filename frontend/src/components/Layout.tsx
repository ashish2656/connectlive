import React from 'react';
import { Box, Container, Flex, Button, Heading, useColorModeValue } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <Box as="nav" bg={bgColor} borderBottom="1px" borderColor={borderColor} py={4}>
        <Container maxW="container.xl">
          <Flex justify="space-between" align="center">
            <RouterLink to="/">
              <Heading size="lg" color="brand.500">ConnectLive</Heading>
            </RouterLink>
            <Flex gap={4}>
              {user ? (
                <>
                  <Button as={RouterLink} to="/" variant="ghost">
                    Home
                  </Button>
                  <Button as={RouterLink} to="/friends" variant="ghost">
                    Friends
                  </Button>
                  <Button as={RouterLink} to="/profile" variant="ghost">
                    Profile
                  </Button>
                  <Button onClick={handleLogout} variant="ghost">
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button as={RouterLink} to="/login" variant="ghost">
                    Login
                  </Button>
                  <Button as={RouterLink} to="/register" variant="solid" colorScheme="brand">
                    Sign Up
                  </Button>
                </>
              )}
            </Flex>
          </Flex>
        </Container>
      </Box>

      <Box flex="1" py={8}>
        <Container maxW="container.xl">
          {children}
        </Container>
      </Box>

      <Box as="footer" bg={bgColor} borderTop="1px" borderColor={borderColor} py={4}>
        <Container maxW="container.xl">
          <Flex justify="center" align="center">
            <Box textAlign="center" color="gray.500">
              © {new Date().getFullYear()} ConnectLive. All rights reserved.
            </Box>
          </Flex>
        </Container>
      </Box>
    </Box>
  );
};

export default Layout; 