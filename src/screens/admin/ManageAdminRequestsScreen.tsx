import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Card, Button, Text, ActivityIndicator, Title } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';

const ManageAdminRequestsScreen: React.FC = () => {
  const { getRoleRequests, approveRoleRequest, rejectRoleRequest } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const reqs = await getRoleRequests();
      setRequests(reqs);
    } catch (e) {
      Alert.alert('Error', 'Failed to load admin requests.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (userId: string) => {
    try {
      await approveRoleRequest(userId);
      fetchRequests();
      Alert.alert('Success', 'User promoted to admin.');
    } catch (e) {
      Alert.alert('Error', 'Failed to approve request.');
    }
  };

  const handleReject = async (userId: string) => {
    try {
      await rejectRoleRequest(userId);
      fetchRequests();
      Alert.alert('Request Rejected', 'Admin request has been rejected.');
    } catch (e) {
      Alert.alert('Error', 'Failed to reject request.');
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} />;
  }

  return (
    <View style={styles.container}>
      <Title style={styles.title}>Admin Privilege Requests</Title>
      {requests.length === 0 ? (
        <Text style={{ marginTop: 32, textAlign: 'center' }}>No pending admin requests.</Text>
      ) : (
        requests.map(user => (
          <Card key={user.id} style={styles.card}>
            <Card.Title title={user.name} subtitle={user.email} />
            <Card.Content>
              <Text>Requested at: {user.lastRequested ? new Date(user.lastRequested).toLocaleString() : 'Unknown'}</Text>
            </Card.Content>
            <Card.Actions>
              <Button mode="contained" onPress={() => handleApprove(user.id)} style={styles.approveBtn}>
                Approve
              </Button>
              <Button mode="outlined" onPress={() => handleReject(user.id)} style={styles.rejectBtn}>
                Reject
              </Button>
            </Card.Actions>
          </Card>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f6f6f6',
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  card: {
    marginBottom: 16,
  },
  approveBtn: {
    marginRight: 8,
  },
  rejectBtn: {
    marginLeft: 8,
  },
});

export default ManageAdminRequestsScreen; 