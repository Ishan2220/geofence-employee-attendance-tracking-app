import React, { useState, useEffect, useCallback } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Text, TextInput, Button, Card, Snackbar, ActivityIndicator, Switch, Avatar, useTheme as usePaperTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

const ProfileScreen: React.FC = () => {
  const { user, logout, setUser, updateUser, hasPermission, inviteAdmin, changeUserRole, getRoleRequests, approveRoleRequest, requestAdminRole, canRequestRole, toggleNotifications, updateNotificationSettings } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const paperTheme = usePaperTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', error: false });
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    attendanceReminders: true,
    approvalAlerts: true,
    systemUpdates: true,
  });
  const [canRequest, setCanRequest] = useState(true);

  // Get user initials for avatar
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await logout();
    } catch (error) {
      setSnackbar({ visible: true, message: 'Failed to logout', error: true });
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const refreshUser = async () => {
        const usersData = await AsyncStorage.getItem('users');
        const users = usersData ? JSON.parse(usersData) : [];
        const updatedUser = users.find((u: any) => u.id === user.id);
        if (updatedUser) setUser(updatedUser);
      };
      refreshUser();
    }, [user.id])
  );

  useEffect(() => {
    if (user?.notificationSettings) {
      setNotificationsEnabled(user.notificationSettings.enabled || false);
      setNotificationSettings({
        attendanceReminders: user.notificationSettings.attendanceReminders || false,
        approvalAlerts: user.notificationSettings.approvalAlerts || false,
        systemUpdates: user.notificationSettings.systemUpdates || false,
      });
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'employee' && canRequestRole) {
      canRequestRole().then(setCanRequest);
    }
  }, [user, canRequestRole]);

  const handleRequestAdmin = async () => {
    try {
      setIsLoading(true);
      await requestAdminRole();
      setSnackbar({ visible: true, message: 'Admin privileges request sent!', error: false });
      setCanRequest(false);
    } catch (error: any) {
      setSnackbar({ visible: true, message: error.message || 'Failed to request admin privileges', error: true });
    } finally {
      setIsLoading(false);
    }
  };

  const navigation = useNavigation();
  const handleManageGeofences = () => {
    navigation.navigate('ManageGeofences');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <LinearGradient
        colors={[theme.primary, theme.primaryLight]}
        style={{ paddingTop: 80, paddingBottom: 40, alignItems: 'center', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
      >
        <Avatar.Text
          size={80}
          label={getInitials(user?.name)}
          style={{ backgroundColor: theme.primary, marginBottom: 12 }}
          color={theme.card}
        />
        <Text variant="headlineMedium" style={{ color: theme.text, fontWeight: 'bold', marginBottom: 4 }}>{user?.name}</Text>
        <Text variant="titleSmall" style={{ color: theme.textSecondary, opacity: 0.8 }}>{user?.email}</Text>
        <Text style={{ color: theme.textSecondary, marginTop: 8, fontWeight: '600', letterSpacing: 1 }}>{user?.role?.toUpperCase()}</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
        <Card style={{ borderRadius: 18, padding: 18, backgroundColor: theme.card, elevation: 4, marginBottom: 18 }}>
          <Card.Title title="Profile" titleStyle={{ color: theme.text, fontWeight: 'bold' }} />
          <TextInput
            label="Full Name"
            value={user?.name}
            disabled
            left={<TextInput.Icon icon="account-outline" />}
            style={{ marginBottom: 16, backgroundColor: theme.inputBackground || theme.card, borderRadius: 8 }}
            mode="outlined"
            theme={{ colors: { placeholder: '#fff', text: theme.text, background: theme.inputBackground || theme.card, primary: '#fff', outline: '#fff' } }}
          />
          <TextInput
            label="Email"
            value={user?.email}
            disabled
            left={<TextInput.Icon icon="email-outline" />}
            style={{ marginBottom: 16, backgroundColor: theme.inputBackground || theme.card, borderRadius: 8 }}
            mode="outlined"
            theme={{ colors: { placeholder: '#fff', text: theme.text, background: theme.inputBackground || theme.card, primary: '#fff', outline: '#fff' } }}
          />
          <TextInput
            label="Department"
            value={user?.department}
            disabled
            left={<TextInput.Icon icon="office-building-outline" />}
            style={{ marginBottom: 16, backgroundColor: theme.inputBackground || theme.card, borderRadius: 8 }}
            mode="outlined"
            theme={{ colors: { placeholder: '#fff', text: theme.text, background: theme.inputBackground || theme.card, primary: '#fff', outline: '#fff' } }}
          />
        </Card>
        <Card style={{ borderRadius: 18, padding: 18, backgroundColor: theme.card, elevation: 4, marginBottom: 18 }}>
          <Card.Title title="Settings" titleStyle={{ color: theme.text, fontWeight: 'bold' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ flex: 1, color: theme.text }}>Dark Mode</Text>
            <Switch value={isDark} onValueChange={toggleTheme} color={theme.primary} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ flex: 1, color: theme.text }}>Enable Notifications</Text>
            <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} color={theme.primary} />
          </View>
          {/* Request Admin Privileges Button for employees only */}
          {user?.role === 'employee' && (
            <Button
              mode="contained"
              onPress={handleRequestAdmin}
              loading={isLoading}
              disabled={isLoading || !canRequest || user?.roleChangeRequested}
              style={{ marginTop: 8, borderRadius: 8 }}
              icon="account-key"
              contentStyle={{ paddingVertical: 6 }}
            >
              {user?.roleChangeRequested ? 'Request Pending' : 'Request Admin Privileges'}
            </Button>
          )}
          {/* Manage Geofences Button for admins only */}
          {user?.role === 'admin' && (
            <>
              <Button
                mode="contained"
                onPress={handleManageGeofences}
                style={{ marginTop: 8, borderRadius: 8 }}
                icon="map-marker-radius"
                contentStyle={{ paddingVertical: 6 }}
              >
                Manage Geofences
              </Button>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('ManageAdminRequests')}
                style={{ marginTop: 8, borderRadius: 8 }}
                icon="account-check-outline"
                contentStyle={{ paddingVertical: 6 }}
              >
                Admin Requests
              </Button>
            </>
          )}
          <Button
            mode="contained"
            onPress={handleLogout}
            loading={isLoading}
            disabled={isLoading}
            style={{ marginTop: 8, borderRadius: 8 }}
            icon="logout"
            contentStyle={{ paddingVertical: 6 }}
          >
            Logout
          </Button>
        </Card>
      </ScrollView>
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
        style={{ backgroundColor: snackbar.error ? paperTheme.colors.error : paperTheme.colors.primary }}
      >
        {snackbar.message}
      </Snackbar>
      {isLoading && <ActivityIndicator animating={true} size="large" style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -24, marginTop: -24 }} />}
    </KeyboardAvoidingView>
  );
};

export default ProfileScreen; 