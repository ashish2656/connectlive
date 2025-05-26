import React from 'react';
import { Box, Text } from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';

const Meeting: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();

  return (
    <Layout>
      <Box p={4}>
        <Text>Meeting ID: {meetingId}</Text>
      </Box>
    </Layout>
  );
};

export default Meeting; 