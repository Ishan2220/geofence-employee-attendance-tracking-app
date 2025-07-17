import React, { useEffect, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, Text, TextInput, Button, Chip, Divider, Snackbar, useTheme, ActivityIndicator, IconButton, Avatar } from 'react-native-paper';

interface Geofence {
  latitude: string;
  longitude: string;
  radius: string;
}

const GEOFENCE_KEY_PREFIX = 'geofences_';

const ManageGeofencesScreen: React.FC = () => {
  const theme = useTheme();
  const [employees, setEmployees] = useState<any[]>([]);
  const [geofences, setGeofences] = useState<Record<string, Geofence[]>>({});
  const [inputs, setInputs] = useState<Record<string, Geofence>>({});
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', error: false });

  useEffect(() => {
    const fetchEmployeesAndGeofences = async () => {
      setLoading(true);
      try {
        const usersData = await AsyncStorage.getItem('users');
        const users = usersData ? JSON.parse(usersData) : [];
        const emps = users.filter((u: any) => u.role === 'employee');
        setEmployees(emps);
        // Load geofences for each employee
        const geofenceData: Record<string, Geofence[]> = {};
        for (const emp of emps) {
          const key = GEOFENCE_KEY_PREFIX + emp.id;
          const data = await AsyncStorage.getItem(key);
          geofenceData[emp.id] = data ? JSON.parse(data) : [];
        }
        setGeofences(geofenceData);
      } catch (e) {
        setSnackbar({ visible: true, message: 'Failed to load data', error: true });
      } finally {
        setLoading(false);
      }
    };
    fetchEmployeesAndGeofences();
  }, []);

  const handleInputChange = (empId: string, field: keyof Geofence, value: string) => {
    setInputs(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: value,
      },
    }));
  };

  const handleAddGeofence = async (empId: string) => {
    const input = inputs[empId];
    if (!input || !input.latitude || !input.longitude || !input.radius) {
      setSnackbar({ visible: true, message: 'Please enter all fields', error: true });
      return;
    }
    try {
      const newGeofence: Geofence = {
        latitude: input.latitude,
        longitude: input.longitude,
        radius: input.radius,
      };
      const updated = [...(geofences[empId] || []), newGeofence];
      await AsyncStorage.setItem(GEOFENCE_KEY_PREFIX + empId, JSON.stringify(updated));
      setGeofences(prev => ({ ...prev, [empId]: updated }));
      setInputs(prev => ({ ...prev, [empId]: { latitude: '', longitude: '', radius: '' } }));
      setSnackbar({ visible: true, message: 'Geofence added', error: false });
    } catch (e) {
      setSnackbar({ visible: true, message: 'Failed to add geofence', error: true });
    }
  };

  const handleRemoveGeofence = async (empId: string, idx: number) => {
    try {
      const updated = geofences[empId].filter((_: any, i: number) => i !== idx);
      await AsyncStorage.setItem(GEOFENCE_KEY_PREFIX + empId, JSON.stringify(updated));
      setGeofences(prev => ({ ...prev, [empId]: updated }));
      setSnackbar({ visible: true, message: 'Geofence removed', error: false });
    } catch (e) {
      setSnackbar({ visible: true, message: 'Failed to remove geofence', error: true });
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <Text variant="headlineMedium" style={{ fontWeight: 'bold', marginBottom: 16 }}>Manage Geofences</Text>
        {loading ? (
          <ActivityIndicator size="large" style={{ marginTop: 40 }} />
        ) : employees.length === 0 ? (
          <Text>No employees found.</Text>
        ) : (
          employees.map(emp => (
            <Card key={emp.id} style={{ marginBottom: 20, borderRadius: 16, elevation: 3 }}>
              <Card.Title title={emp.name} subtitle={emp.email} left={props => <Avatar.Text {...props} label={emp.name ? emp.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2) : '?'} />} />
              <Card.Content>
                <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Assigned Geofences:</Text>
                {geofences[emp.id] && geofences[emp.id].length > 0 ? (
                  geofences[emp.id].map((geo, idx) => (
                    <Chip key={idx} style={{ marginBottom: 6, marginRight: 6 }} onClose={() => handleRemoveGeofence(emp.id, idx)}>
                      Lat: {geo.latitude}, Lng: {geo.longitude}, R: {geo.radius}m
                    </Chip>
                  ))
                ) : (
                  <Text style={{ color: theme.colors.onSurfaceDisabled, marginBottom: 6 }}>No geofences assigned.</Text>
                )}
                <Divider style={{ marginVertical: 8 }} />
                <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Add Geofence</Text>
                <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                  <TextInput
                    label="Latitude"
                    value={inputs[emp.id]?.latitude || ''}
                    onChangeText={v => handleInputChange(emp.id, 'latitude', v)}
                    style={{ flex: 1, marginRight: 6 }}
                    mode="outlined"
                    keyboardType="numeric"
                  />
                  <TextInput
                    label="Longitude"
                    value={inputs[emp.id]?.longitude || ''}
                    onChangeText={v => handleInputChange(emp.id, 'longitude', v)}
                    style={{ flex: 1, marginRight: 6 }}
                    mode="outlined"
                    keyboardType="numeric"
                  />
                  <TextInput
                    label="Radius (m)"
                    value={inputs[emp.id]?.radius || ''}
                    onChangeText={v => handleInputChange(emp.id, 'radius', v)}
                    style={{ flex: 1 }}
                    mode="outlined"
                    keyboardType="numeric"
                  />
                </View>
                <Button mode="contained" onPress={() => handleAddGeofence(emp.id)} icon="plus" style={{ borderRadius: 8 }}>
                  Add Geofence
                </Button>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
        style={{ backgroundColor: snackbar.error ? theme.colors.error : theme.colors.primary }}
      >
        {snackbar.message}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

export default ManageGeofencesScreen; 