import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Switch,
  Image,
  Platform,
  Dimensions,
  ActivityIndicator,
  TextInput,
  FlatList,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';

// Modern, professional color palette
const COLORS = {
  primary: '#3B82F6',         // Blue (primary brand color)
  primaryDark: '#2563EB',     // Darker blue for pressed states
  secondary: '#10B981',       // Emerald green for success/actions
  accent: '#F59E0B',          // Amber for attention/warnings
  background: '#F9FAFB',      // Light gray background
  card: '#FFFFFF',            // White for cards
  text: '#1F2937',            // Near black for text
  textSecondary: '#6B7280',   // Medium gray for secondary text
  border: '#E5E7EB',          // Light gray for borders
  error: '#EF4444',           // Red for errors
  success: '#10B981',         // Green for success
  placeholder: '#9CA3AF',     // Gray for placeholders
  shadow: 'rgba(0, 0, 0, 0.08)', // Shadow color
};

const { width } = Dimensions.get('window');

const PERMISSIONS = {
  MANAGE_USERS: 'manage:users',
  ASSIGN_ROLES: 'assign:roles',
  VIEW_ALL_ATTENDANCE: 'view:all-attendance',
  MANAGE_LOCATIONS: 'manage:locations',
  INVITE_ADMINS: 'invite:admins',
};

const ProfileScreen: React.FC = () => {
  const { user, logout, setUser, updateUser, hasPermission, inviteAdmin, changeUserRole, getRoleRequests, approveRoleRequest, requestAdminRole, canRequestRole, toggleNotifications, updateNotificationSettings } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // For geofence management
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [geofenceLocation, setGeofenceLocation] = useState({
    name: 'Office',
    latitude: '37.7749',
    longitude: '-122.4194',
    radius: '100',
  });

  const [isAdminInviteModalVisible, setIsAdminInviteModalVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [roleRequests, setRoleRequests] = useState<{id: string, email: string, name: string}[]>([]);
  const [isRoleRequestsModalVisible, setIsRoleRequestsModalVisible] = useState(false);
  const [hasRequestedAdmin, setHasRequestedAdmin] = useState(false);
  const [canRequest, setCanRequest] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    attendanceReminders: true,
    approvalAlerts: true,
    systemUpdates: true,
  });

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await logout();
      // No navigation needed - AuthContext and AppNavigator will handle this
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
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
    // One-time cleanup: remove default office location from all employees
    const cleanupDefaultOffice = async () => {
      const usersData = await AsyncStorage.getItem('users');
      let users = usersData ? JSON.parse(usersData) : [];
      let changed = false;
      users = users.map((u: any) => {
        if (
          u.assignedLocation &&
          u.assignedLocation.latitude === 16.732237531322607 &&
          u.assignedLocation.longitude === 74.24010578614681
        ) {
          changed = true;
          return { ...u, assignedLocation: {} };
        }
        return u;
      });
      if (changed) {
        await AsyncStorage.setItem('users', JSON.stringify(users));
      }
    };
    cleanupDefaultOffice();
  }, []);

  useEffect(() => {
    const checkRequestStatus = async () => {
      if (user && user.role === 'employee') {
        const usersData = await AsyncStorage.getItem('users');
        if (usersData) {
          const users = JSON.parse(usersData);
          const currentUser = users.find((u: any) => u.id === user.id);
          if (currentUser && currentUser.roleChangeRequested) {
            setHasRequestedAdmin(true);
          }
        }
      }
    };
    
    checkRequestStatus();
  }, [user]);

  useEffect(() => {
    // Check if user can request admin role
    const checkCanRequest = async () => {
      try {
        const result = await canRequestRole();
        setCanRequest(result);
      } catch (error) {
        console.error('Error checking if user can request role:', error);
      }
    };

    // Load notification settings
    const loadNotificationSettings = () => {
      if (user?.notificationSettings) {
        setNotificationsEnabled(user.notificationSettings.enabled || false);
        setNotificationSettings({
          attendanceReminders: user.notificationSettings.attendanceReminders || false,
          approvalAlerts: user.notificationSettings.approvalAlerts || false,
          systemUpdates: user.notificationSettings.systemUpdates || false,
        });
      }
    };

    checkCanRequest();
    loadNotificationSettings();
  }, [user, canRequestRole]);

  const ProfileItem = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
    <View style={[styles.profileItem, { backgroundColor: theme.card, shadowColor: theme.border }]}> 
      <View style={styles.itemHeader}>
        <Ionicons name={icon as any} size={24} color={theme.primary} />
        <Text style={[styles.itemLabel, { color: theme.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.itemValue, { color: theme.text }]}>{value}</Text>
    </View>
  );

  // Get user initials for avatar
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Prompt confirmation before logging out
  const confirmLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: handleLogout }
      ]
    );
  };

  // Only used by admins to assign office locations to employees
  const manageEmployeeLocations = async () => {
    if (user?.role !== 'admin') return;
    
    try {
      setIsSaving(true);
      // Get all users
      const usersData = await AsyncStorage.getItem('users');
      
      if (!usersData) {
        Alert.alert('Error', 'No users found');
        setIsSaving(false);
        return;
      }
      
      const users = JSON.parse(usersData);
      const employeesList = users.filter(u => u.role === 'employee');
      
      if (employeesList.length === 0) {
        Alert.alert('Info', 'No employees found to assign locations');
        setIsSaving(false);
        return;
      }
      
      // Store employees and show the modal
      setEmployees(employeesList);
      setShowGeofenceModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to load employee data');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle saving the geofence assignment
  const handleSaveGeofence = async () => {
    if (!selectedEmployee) {
      Alert.alert('Error', 'Please select an employee');
      return;
    }

    try {
      setIsSaving(true);
      
      // Validate coordinates
      const latitude = parseFloat(geofenceLocation.latitude);
      const longitude = parseFloat(geofenceLocation.longitude);
      const radius = parseFloat(geofenceLocation.radius);
      
      if (isNaN(latitude) || isNaN(longitude) || isNaN(radius)) {
        Alert.alert('Error', 'Please enter valid coordinates and radius');
        setIsSaving(false);
        return;
      }
      
      // Get all users
      const usersData = await AsyncStorage.getItem('users');
      if (!usersData) {
        Alert.alert('Error', 'Failed to update user data');
        setIsSaving(false);
        return;
      }
      
      const users = JSON.parse(usersData);
      
      // Find and update the selected employee
      const updatedUsers = users.map(u => {
        if (u.email === selectedEmployee.email) {
          return {
            ...u,
            assignedLocation: {
              name: geofenceLocation.name,
              latitude: geofenceLocation.latitude,
              longitude: geofenceLocation.longitude,
              radius: geofenceLocation.radius,
            }
          };
        }
        return u;
      });
      
      // Save updated users
      await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
      
      // Close modal and reset
      setShowGeofenceModal(false);
      setSelectedEmployee(null);
      
      Alert.alert('Success', `Geofence assigned to ${selectedEmployee.name}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to assign geofence');
    } finally {
      setIsSaving(false);
    }
  };

  // Load role requests
  const loadRoleRequests = useCallback(async () => {
    if (user?.role === 'admin' && hasPermission(PERMISSIONS.ASSIGN_ROLES)) {
      try {
        setIsLoading(true);
        const requests = await getRoleRequests();
        setRoleRequests(requests);
      } catch (error) {
        console.error('Failed to load role requests:', error);
        Alert.alert('Error', 'Failed to load role change requests');
      } finally {
        setIsLoading(false);
      }
    }
  }, [user, hasPermission, getRoleRequests]);

  // Handle inviting a new admin
  const handleInviteAdmin = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }
    
    try {
      setIsLoading(true);
      const token = await inviteAdmin(inviteEmail);
      setGeneratedToken(token);
      Alert.alert('Success', 'Admin invitation created successfully');
    } catch (error) {
      console.error('Failed to create admin invitation:', error);
      Alert.alert('Error', 'Failed to create admin invitation');
    } finally {
      setIsLoading(false);
    }
  };

  // Copy invitation token to clipboard
  const copyTokenToClipboard = async () => {
    await Clipboard.setStringAsync(generatedToken);
    Alert.alert('Success', 'Token copied to clipboard');
  };

  // Request admin privileges (for employees)
  const handleRequestAdminRole = async () => {
    try {
      if (!canRequest) {
        Alert.alert(
          'Cannot Request Yet',
          'You must wait 24 hours after your previous rejected request before requesting again.'
        );
        return;
      }

      await requestAdminRole();
      Alert.alert(
        'Request Submitted',
        'Your request to become an admin has been submitted. An existing admin will review your request.'
      );
    } catch (error) {
      console.error('Error requesting admin role:', error);
      Alert.alert('Error', error.message || 'Failed to request admin role');
    }
  };

  // Approve a role change request
  const handleApproveRequest = async (userId: string) => {
    try {
      setIsLoading(true);
      await approveRoleRequest(userId);
      
      // Remove the approved request from the list
      setRoleRequests(prev => prev.filter(req => req.id !== userId));
      
      Alert.alert('Success', 'User has been promoted to admin');
    } catch (error) {
      console.error('Failed to approve role request:', error);
      Alert.alert('Error', 'Failed to approve role request');
    } finally {
      setIsLoading(false);
    }
  };

  // Reject a role change request
  const handleRejectRequest = async (userId: string) => {
    // This simply removes the request, but doesn't update the user's status
    // In a real app, you would want to update the user's roleChangeRequested flag
    setRoleRequests(prev => prev.filter(req => req.id !== userId));
  };

  // Render a role request item
  const renderRoleRequestItem = ({ item }: { item: {id: string, email: string, name: string} }) => (
    <View style={styles.requestItem}>
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>{item.name}</Text>
        <Text style={styles.requestEmail}>{item.email}</Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity 
          style={[styles.requestButton, styles.approveButton]}
          onPress={() => handleApproveRequest(item.id)}
          disabled={isLoading}
        >
          <Text style={styles.requestButtonText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.requestButton, styles.rejectButton]}
          onPress={() => handleRejectRequest(item.id)}
          disabled={isLoading}
        >
          <Text style={styles.requestButtonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleThemeToggle = () => {
    toggleTheme();
  };

  const renderSettingItem = ({ icon, title, description, action, rightElement }) => (
    <TouchableOpacity 
      style={[styles.settingItem, { backgroundColor: theme.card }]}
      onPress={action}
      disabled={!action}
    >
      <View style={styles.settingItemLeft}>
        <View style={[styles.settingIconContainer, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)' }]}>
          {icon}
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
          {description && <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>{description}</Text>}
        </View>
      </View>
      {rightElement}
    </TouchableOpacity>
  );

  const handleToggleNotifications = async (value) => {
    try {
      setNotificationsEnabled(value);
      await toggleNotifications(value);
    } catch (error) {
      setNotificationsEnabled(!value); // Revert on error
      console.error('Error toggling notifications:', error);
    }
  };

  const handleNotificationSettingChange = async (key, value) => {
    try {
      const newSettings = {
        ...notificationSettings,
        [key]: value
      };
      
      setNotificationSettings(newSettings);
      
      // Update the full settings object
      await updateNotificationSettings({
        enabled: notificationsEnabled,
        ...newSettings
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={isDark ? ['#1E40AF', '#1E3A8A'] : ['#3B82F6', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>My Profile</Text>
      </LinearGradient>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.card, shadowColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)' }]}>
          <LinearGradient
            colors={isDark ? ['#1E40AF', '#1E3A8A'] : ['#3B82F6', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarGradient}
          >
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </LinearGradient>
          <View style={styles.profileInfo}>
            <Text style={[styles.userName, { color: theme.text }]}>{user?.name}</Text>
            <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {user?.role === 'admin' ? 'ADMINISTRATOR' : 'EMPLOYEE'}
              </Text>
            </View>
          </View>
        </View>

        {/* Display Mode Section */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionHeader, { color: theme.text }]}>Display</Text>
          <View style={styles.modeToggleContainer}>
            <View style={styles.modeOption}>
              <View style={[styles.modeIconContainer, { backgroundColor: !isDark ? theme.primary : 'transparent' }]}>
                <FontAwesome5 name="sun" size={16} color={!isDark ? '#fff' : theme.textSecondary} />
              </View>
              <Text style={[styles.modeText, { color: !isDark ? theme.primary : theme.textSecondary }]}>Light</Text>
            </View>
            
            <Switch
              value={isDark}
              onValueChange={handleThemeToggle}
              trackColor={{ false: '#CBD5E1', true: isDark ? '#475569' : '#60A5FA' }}
              thumbColor={isDark ? '#3B82F6' : '#fff'}
              ios_backgroundColor="#CBD5E1"
              style={styles.modeSwitch}
            />
            
            <View style={styles.modeOption}>
              <View style={[styles.modeIconContainer, { backgroundColor: isDark ? theme.primary : 'transparent' }]}>
                <FontAwesome5 name="moon" size={14} color={isDark ? '#fff' : theme.textSecondary} />
              </View>
              <Text style={[styles.modeText, { color: isDark ? theme.primary : theme.textSecondary }]}>Dark</Text>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionHeader, { color: theme.text }]}>Settings</Text>
          
          {renderSettingItem({
            icon: <Ionicons name="notifications-outline" size={22} color={theme.primary} />,
            title: "Notifications",
            description: "Manage your notifications",
            action: () => Alert.alert('Coming Soon', 'This feature is under development'),
            rightElement: <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          })}
          
          {renderSettingItem({
            icon: <Ionicons name="shield-checkmark-outline" size={22} color={theme.primary} />,
            title: "Privacy & Security",
            description: "Control your data and privacy",
            action: () => Alert.alert('Coming Soon', 'This feature is under development'),
            rightElement: <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          })}
          
          {renderSettingItem({
            icon: <Ionicons name="help-circle-outline" size={22} color={theme.primary} />,
            title: "Help & Support",
            description: "Get help with the app",
            action: () => Alert.alert('Coming Soon', 'This feature is under development'),
            rightElement: <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          })}
        </View>

        {/* Notification Settings Section */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionHeader, { color: theme.text }]}>Notification Settings</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <Ionicons name="notifications-outline" size={20} color={theme.primary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Enable Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#767577', true: theme.primary + '80' }}
              thumbColor={notificationsEnabled ? theme.primary : '#f4f3f4'}
            />
          </View>
          
          {notificationsEnabled && (
            <>
              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <Ionicons name="time-outline" size={20} color={theme.primary} />
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Attendance Reminders</Text>
                </View>
                <Switch
                  value={notificationSettings.attendanceReminders}
                  onValueChange={(value) => handleNotificationSettingChange('attendanceReminders', value)}
                  trackColor={{ false: '#767577', true: theme.primary + '80' }}
                  thumbColor={notificationSettings.attendanceReminders ? theme.primary : '#f4f3f4'}
                />
              </View>
              
              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={theme.primary} />
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Approval Alerts</Text>
                </View>
                <Switch
                  value={notificationSettings.approvalAlerts}
                  onValueChange={(value) => handleNotificationSettingChange('approvalAlerts', value)}
                  trackColor={{ false: '#767577', true: theme.primary + '80' }}
                  thumbColor={notificationSettings.approvalAlerts ? theme.primary : '#f4f3f4'}
                />
              </View>
              
              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <Ionicons name="information-circle-outline" size={20} color={theme.primary} />
                  <Text style={[styles.settingLabel, { color: theme.text }]}>System Updates</Text>
                </View>
                <Switch
                  value={notificationSettings.systemUpdates}
                  onValueChange={(value) => handleNotificationSettingChange('systemUpdates', value)}
                  trackColor={{ false: '#767577', true: theme.primary + '80' }}
                  thumbColor={notificationSettings.systemUpdates ? theme.primary : '#f4f3f4'}
                />
              </View>
            </>
          )}
        </View>

        {/* Admin section */}
        {user?.role === 'admin' && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionHeader, { color: theme.text }]}>Admin Tools</Text>
            
            {renderSettingItem({
              icon: <Ionicons name="location-outline" size={22} color={theme.primary} />,
              title: "Manage Employee Locations",
              description: "Assign office locations to employees",
              action: manageEmployeeLocations,
              rightElement: isSaving ? 
                <ActivityIndicator size="small" color={theme.primary} /> : 
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            })}
            
            {hasPermission(PERMISSIONS.ASSIGN_ROLES) && (
              <>
                {renderSettingItem({
                  icon: <Ionicons name="person-add-outline" size={22} color={theme.primary} />,
                  title: "Invite Administrator",
                  description: "Create invitation tokens for new admins",
                  action: () => {
                    setInviteEmail('');
                    setGeneratedToken('');
                    setIsAdminInviteModalVisible(true);
                  },
                  rightElement: <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                })}
                
                {renderSettingItem({
                  icon: <Ionicons name="people-outline" size={22} color={theme.primary} />,
                  title: "Role Requests",
                  description: "Review and approve admin role requests",
                  action: () => {
                    loadRoleRequests();
                    setIsRoleRequestsModalVisible(true);
                  },
                  rightElement: <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                })}
              </>
            )}
          </View>
        )}

        {/* Admin Request section (employee only) */}
        {user?.role === 'employee' && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionHeader, { color: theme.text }]}>Admin Access</Text>
            
            {!hasRequestedAdmin ? (
              renderSettingItem({
                icon: <Ionicons name="shield-outline" size={22} color={theme.primary} />,
                title: "Request Admin Privileges",
                description: "Apply for administrator access",
                action: handleRequestAdminRole,
                rightElement: isLoading ? 
                  <ActivityIndicator size="small" color={theme.primary} /> : 
                  <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              })
            ) : (
              renderSettingItem({
                icon: <Ionicons name="time-outline" size={22} color={theme.accent} />,
                title: "Admin Request Pending",
                description: "Your request is waiting for approval",
                action: null,
                rightElement: <Ionicons name="hourglass-outline" size={20} color={theme.accent} />
              })
            )}
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity 
          style={[styles.logoutButton, { 
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)' 
          }]}
          onPress={confirmLogout}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.error} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={22} color={theme.error} />
              <Text style={[styles.logoutText, { color: theme.error }]}>Logout</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: theme.textTertiary }]}>Version 1.0.0</Text>
      </ScrollView>

      {/* Geofence Assignment Modal */}
      <Modal
        visible={showGeofenceModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGeofenceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Assign Office Location</Text>
              <TouchableOpacity onPress={() => setShowGeofenceModal(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Employee</Text>
              
              <ScrollView 
                style={[styles.employeeList, { borderColor: theme.border }]}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
              >
                {employees.map(emp => (
                  <TouchableOpacity
                    key={emp.id}
                    style={[
                      styles.employeeCard,
                      selectedEmployee?.id === emp.id && styles.selectedEmployeeCard,
                      { backgroundColor: theme.background }
                    ]}
                    onPress={() => setSelectedEmployee(emp)}
                  >
                    <View style={[styles.employeeAvatar, { backgroundColor: theme.primary }]}>
                      <Text style={[styles.employeeAvatarText, { color: '#fff' }]}>
                        {getInitials(emp.name)}
                      </Text>
                    </View>
                    <Text style={[styles.employeeName, { color: theme.text }]}>{emp.name}</Text>
                    <Text style={[styles.employeeEmail, { color: theme.textSecondary }]}>{emp.email}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Location Details</Text>
              
              <View style={[styles.inputGroup, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Location Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
                  value={geofenceLocation.name}
                  onChangeText={(text) => setGeofenceLocation({...geofenceLocation, name: text})}
                  placeholder="e.g. Main Office"
                />
              </View>
              
              <View style={[styles.inputGroup, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Latitude</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
                  value={geofenceLocation.latitude}
                  onChangeText={(text) => setGeofenceLocation({...geofenceLocation, latitude: text})}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 37.7749"
                />
              </View>
              
              <View style={[styles.inputGroup, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Longitude</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
                  value={geofenceLocation.longitude}
                  onChangeText={(text) => setGeofenceLocation({...geofenceLocation, longitude: text})}
                  keyboardType="decimal-pad"
                  placeholder="e.g. -122.4194"
                />
              </View>
              
              <View style={[styles.inputGroup, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Radius (meters)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
                  value={geofenceLocation.radius}
                  onChangeText={(text) => setGeofenceLocation({...geofenceLocation, radius: text})}
                  keyboardType="number-pad"
                  placeholder="e.g. 100"
                />
              </View>
              
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.primary }]}
                onPress={handleSaveGeofence}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.saveButtonText, { color: '#fff' }]}>Assign Location</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Admin Invite Modal */}
      <Modal
        visible={isAdminInviteModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAdminInviteModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite New Admin</Text>
              <TouchableOpacity onPress={() => setIsAdminInviteModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Create an invitation for a new administrator. The invitation token will be valid for 48 hours.
            </Text>
            
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor={COLORS.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                value={inviteEmail}
                onChangeText={setInviteEmail}
              />
            </View>
            
            {isLoading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={styles.loadingIndicator} />
            ) : generatedToken ? (
              <View style={styles.tokenContainer}>
                <Text style={styles.tokenLabel}>Invitation Token:</Text>
                <TouchableOpacity 
                  style={styles.tokenValue}
                  onPress={copyTokenToClipboard}
                >
                  <Text style={styles.tokenText} numberOfLines={2}>{generatedToken}</Text>
                  <Ionicons name="copy-outline" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.tokenHelp}>Tap to copy. Share this token securely with the invitee.</Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.generateButton}
                onPress={handleInviteAdmin}
              >
                <Text style={styles.generateButtonText}>Generate Invitation</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Role Requests Modal */}
      <Modal
        visible={isRoleRequestsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsRoleRequestsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Admin Role Requests</Text>
              <TouchableOpacity onPress={() => setIsRoleRequestsModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            {isLoading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={styles.loadingIndicator} />
            ) : roleRequests.length > 0 ? (
              <FlatList
                data={roleRequests}
                renderItem={renderRoleRequestItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.requestsList}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="alert-circle-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyStateText}>No pending role requests</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: 'white',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  modeOption: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modeSwitch: {
    transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginVertical: 10,
  },
  logoutText: {
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 10,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalBody: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  employeeList: {
    flexGrow: 0,
    marginBottom: 16,
  },
  employeeCard: {
    width: 120,
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
  },
  selectedEmployeeCard: {
    backgroundColor: COLORS.primary + '20', // Light blue with transparency
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  employeeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  employeeAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  employeeEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 48,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 10,
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  tokenContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 16,
    marginTop: 10,
  },
  tokenLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  tokenValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 6,
    marginBottom: 8,
  },
  tokenText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginRight: 8,
  },
  tokenHelp: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  requestsList: {
    maxHeight: 300,
  },
  requestItem: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 12,
  },
  requestInfo: {
    marginBottom: 10,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  requestEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  requestButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  approveButton: {
    backgroundColor: COLORS.secondary,
  },
  rejectButton: {
    backgroundColor: COLORS.error,
  },
  requestButtonText: {
    color: COLORS.card,
    fontWeight: '500',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    marginLeft: 10,
  },
});

export default ProfileScreen; 