import React from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const Home: React.FC = () => {
  const { user } = useAuth();

  return (
    <Layout>
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="stretch">
          <Box>
            <Heading size="lg" mb={4}>Welcome, {user?.username}!</Heading>
            <Text>Your new meeting experience is coming soon.</Text>
          </Box>
        </VStack>
      </Container>
    </Layout>
  );
};

export default Home; 