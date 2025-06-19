import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Notification } from '../types';
import * as SecureStore from 'expo-secure-store';
import { decode as atob, encode as btoa } from 'base-64';
import { Alert } from 'react-native';

// Add new interface for authorization roles and permissions
interface Role {
  name: 'admin' | 'employee';
  permissions: string[];
}

// Define admin invitation interface
interface AdminInvitation {
  email: string;
  token: string;
  expiresAt: number;
  createdBy: string;
}

// Authentication context with expanded methods
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userData: Partial<User>, inviteToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  updateUser: (userData: User) => Promise<void>;
  // New admin management functions
  inviteAdmin: (email: string) => Promise<string>;
  changeUserRole: (userId: string, newRole: 'admin' | 'employee') => Promise<void>;
  getRoleRequests: () => Promise<{id: string, email: string, name: string, lastRequested: number}[]>;
  approveRoleRequest: (userId: string) => Promise<void>;
  rejectRoleRequest: (userId: string) => Promise<void>;
  requestAdminRole: () => Promise<void>;
  // Function to check if user has permission
  hasPermission: (permission: string) => boolean;
  // New function to reset stored data
  resetStoredData: () => Promise<void>;
  // Notification management
  toggleNotifications: (enabled: boolean) => Promise<void>;
  updateNotificationSettings: (settings: User['notificationSettings']) => Promise<void>;
  getNotifications: () => Promise<Notification[]>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  canRequestRole: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface StoredUser extends User {
  password: string;
  roleChangeRequested?: boolean;
}

// Constants for permissions
const PERMISSIONS = {
  MANAGE_USERS: 'manage:users',
  ASSIGN_ROLES: 'assign:roles',
  VIEW_ALL_ATTENDANCE: 'view:all-attendance',
  MANAGE_LOCATIONS: 'manage:locations',
  INVITE_ADMINS: 'invite:admins',
};

// Define role permissions
const ROLES: Record<'admin' | 'employee', string[]> = {
  admin: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.ASSIGN_ROLES,
    PERMISSIONS.VIEW_ALL_ATTENDANCE,
    PERMISSIONS.MANAGE_LOCATIONS,
    PERMISSIONS.INVITE_ADMINS,
  ],
  employee: [],
};

// Secret keys for secure tokens
const JWT_SECRET = 'your-jwt-secret-key-should-be-env-variable';
// In a real app, this would be stored securely on a server

// Simple JWT token generation (for demo - in production use a proper JWT library)
const generateToken = (payload: any, expiresInHours = 24): string => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Date.now();
  const exp = now + expiresInHours * 60 * 60 * 1000;
  const data = {
    ...payload,
    iat: Math.floor(now / 1000),
    exp: Math.floor(exp / 1000),
  };

  const base64Header = btoa(JSON.stringify(header));
  const base64Payload = btoa(JSON.stringify(data));
  
  // In a real app, use a proper HMAC-SHA256 signing algorithm
  // This is simplified for demo purposes
  const signature = btoa(JSON.stringify({ secret: JWT_SECRET, data: base64Header + '.' + base64Payload }));
  
  return `${base64Header}.${base64Payload}.${signature}`;
};

// Simple token verification (for demo - in production use a proper JWT library)
const verifyToken = (token: string): any | null => {
  try {
    const [base64Header, base64Payload, signature] = token.split('.');
    
    // Verify signature (simplified for demo)
    const expectedSignature = btoa(JSON.stringify({ secret: JWT_SECRET, data: base64Header + '.' + base64Payload }));
    if (signature !== expectedSignature) {
      return null;
    }
    
    const payload = JSON.parse(atob(base64Payload));
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

// Constants for storage keys
const ADMIN_INVITATIONS_KEY = 'admin_invitations';
const ROLE_CHANGE_REQUESTS_KEY = 'role_change_requests';
const AUDIT_LOGS_KEY = 'role_audit_logs';
const NOTIFICATIONS_KEY = 'notifications';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const seedAdmin = async () => {
      const usersData = await AsyncStorage.getItem('users');
      let users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      const adminExists = users.some(u => u.role === 'admin');
      if (!adminExists) {
        const adminUser: StoredUser = {
          id: 'admin',
          email: 'admin@onsite.com',
          password: 'admin123',
          name: 'Admin',
          role: 'admin',
          department: 'Admin',
        };
        users.push(adminUser);
        await AsyncStorage.setItem('users', JSON.stringify(users));
        console.log('Default admin account created');
      } else {
        console.log('Admin account already exists');
      }
    };
    seedAdmin();
    loadUser();
  }, []);

  // Helper to log role change activities
  const logRoleChange = async (
    actorId: string, 
    targetId: string, 
    oldRole: string, 
    newRole: string
  ) => {
    try {
      const timestamp = new Date().toISOString();
      const existingLogs = await AsyncStorage.getItem(AUDIT_LOGS_KEY);
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      
      logs.push({
        id: Date.now().toString(),
        timestamp,
        actorId,
        targetId,
        action: 'role_change',
        details: {
          oldRole,
          newRole,
        }
      });
      
      await AsyncStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to log role change:', error);
    }
  };

  const loadUser = async () => {
    try {
      console.log('AuthContext: Loading user from AsyncStorage');
      const userData = await AsyncStorage.getItem('currentUser');
      
      if (userData) {
        console.log('AuthContext: Found stored user data');
        const parsedUser = JSON.parse(userData);
        
        // Verify this user still exists in the users collection
        const usersData = await AsyncStorage.getItem('users');
        const users = usersData ? JSON.parse(usersData) : [];
        const userStillExists = users.some(u => u.id === parsedUser.id);
        
        if (!userStillExists) {
          console.log('AuthContext: Stored user no longer exists in users collection');
          await AsyncStorage.removeItem('currentUser');
          setUser(null);
        } else {
          // Don't expose password in the user state
          const { password, ...userWithoutPassword } = parsedUser;
          console.log(`AuthContext: Setting user state with user: ${userWithoutPassword.email}`);
          setUser(userWithoutPassword);
        }
      } else {
        console.log('AuthContext: No stored user found');
        setUser(null);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      // Reset user state on error
      setUser(null);
    } finally {
      console.log('AuthContext: Finished loading user state');
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log(`Attempting to login with email: ${email}`);
      
      // Get all registered users
      const usersData = await AsyncStorage.getItem('users');
      let users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      
      console.log(`Found ${users.length} users in storage`);
      if (users.length > 0) {
        console.log('Available user emails:');
        users.forEach((user, idx) => {
          console.log(`  ${idx}: ${user.email} (role: ${user.role})`);
        });
      }
      
      // If there are no users at all, create the default admin
      if (users.length === 0) {
        console.log('No users found, creating default admin account');
        const adminUser: StoredUser = {
          id: 'admin',
          email: 'admin@onsite.com',
          password: 'admin123',
          name: 'Admin',
          role: 'admin',
          department: 'Admin',
        };
        users.push(adminUser);
        await AsyncStorage.setItem('users', JSON.stringify(users));
        
        // If the user was trying to log in as this admin, we can continue
        if (email === 'admin@onsite.com' && password === 'admin123') {
          console.log('Logging in as newly created admin');
        }
      }

      // Specifically check for default admin credentials
      if (email === 'admin@onsite.com' && password === 'admin123') {
        console.log('Checking for default admin account');
        // Ensure the admin account exists
        const adminUser = users.find(u => u.email === 'admin@onsite.com');
        
        if (!adminUser) {
          console.log('Admin account not found, creating it');
          const newAdminUser: StoredUser = {
            id: 'admin',
            email: 'admin@onsite.com',
            password: 'admin123',
            name: 'Admin',
            role: 'admin',
            department: 'Admin',
          };
          users.push(newAdminUser);
          await AsyncStorage.setItem('users', JSON.stringify(users));
          
          // Store admin user in state
          const { password: _, ...adminWithoutPassword } = newAdminUser;
          await AsyncStorage.setItem('currentUser', JSON.stringify(newAdminUser));
          
          // Force update the user state
          console.log('Setting admin user in state');
          setUser(adminWithoutPassword);
          console.log('Default admin login successful');
          return;
        } else {
          console.log('Found existing admin account, logging in');
          const { password: _, ...adminWithoutPassword } = adminUser;
          await AsyncStorage.setItem('currentUser', JSON.stringify(adminUser));
          
          // Force update the user state
          console.log('Setting admin user in state');
          setUser(adminWithoutPassword);
          console.log('Admin login successful');
          return;
        }
      }
      
      // Find user with matching email and password
      console.log(`Looking for user with email: ${email}`);
      const matchedUser = users.find(u => u.email === email && u.password === password);
      
      if (!matchedUser) {
        console.log('Invalid credentials or user not found');
        // Try to find if email exists but password is wrong
        const userWithEmail = users.find(u => u.email === email);
        if (userWithEmail) {
          console.log('Email found but password incorrect');
          console.log(`Input password length: ${password.length}, stored password length: ${userWithEmail.password.length}`);
        } else {
          console.log('Email not found in user database');
        }
        throw new Error('Invalid credentials');
      }

      console.log(`User found: ${matchedUser.name}, role: ${matchedUser.role}`);
      
      // Store current user but don't expose password in state
      const { password: _, ...userWithoutPassword } = matchedUser;
      await AsyncStorage.setItem('currentUser', JSON.stringify(matchedUser));
      
      // Force update the user state to trigger navigation change
      console.log('Updating user state with authenticated user');
      setUser(userWithoutPassword);
      console.log('Login successful. User state updated:', userWithoutPassword);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Modified register function to enforce employee role by default
  const register = async (email: string, password: string, userData: Partial<User>, inviteToken?: string) => {
    try {
      setLoading(true);
      
      // Get existing users
      const usersData = await AsyncStorage.getItem('users');
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      
      // Check if email already exists
      if (users.some(u => u.email === email)) {
        throw new Error('Email already registered');
      }

      // Default role is ALWAYS employee, unless explicitly changed via valid token
      let role: 'admin' | 'employee' = 'employee';
      
      // Process invitation token only if one is provided
      if (inviteToken && inviteToken.trim() !== '') {
        try {
          console.log('Validating admin invitation token...');
          
          const invitationsData = await AsyncStorage.getItem(ADMIN_INVITATIONS_KEY);
          const invitations: AdminInvitation[] = invitationsData ? JSON.parse(invitationsData) : [];
          
          console.log(`Found ${invitations.length} total invitations`);
          
          // Find the invitation with matching token
          const invitation = invitations.find(inv => inv.token === inviteToken && inv.email === email);
          
          if (invitation) {
            console.log('Found matching invitation for:', email);
            
            if (invitation.expiresAt > Date.now()) {
              // Valid invitation found
              console.log('Invitation is valid, setting role to admin');
              role = 'admin';
              
              // Remove the used invitation
              const updatedInvitations = invitations.filter(inv => inv.token !== inviteToken);
              await AsyncStorage.setItem(ADMIN_INVITATIONS_KEY, JSON.stringify(updatedInvitations));
              
              // Log this admin creation
              if (invitation.createdBy) {
                logRoleChange(invitation.createdBy, 'new-user', 'none', 'admin');
              }
            } else {
              // Expired invitation
              console.log('Invitation expired:', new Date(invitation.expiresAt).toISOString());
              throw new Error('Admin invitation has expired');
            }
          } else {
            // Invalid invitation
            console.log('No matching invitation found for this email/token');
            throw new Error('Invalid admin invitation token');
          }
        } catch (error) {
          console.error('Error validating invitation token:', error);
          // Default to employee if there's any error with token validation
          role = 'employee';
          throw new Error('Invalid or expired admin invitation');
        }
      }

      console.log(`Final role assignment: ${role}`);
      
      // Create new user with the determined role
      const newUser: StoredUser = {
        id: Date.now().toString(),
        email,
        password, // Store password for login verification
        name: userData.name || '',
        role: role, // Use the role determined by token validation
        department: userData.department || '',
      };
      
      // Add to users list
      users.push(newUser);
      await AsyncStorage.setItem('users', JSON.stringify(users));
      
      // Log user in automatically
      const { password: _, ...userWithoutPassword } = newUser;
      await AsyncStorage.setItem('currentUser', JSON.stringify(newUser));
      setUser(userWithoutPassword);
      
      return; // Success
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Method to check if user has permission
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return ROLES[user.role].includes(permission);
  };

  // Method for admins to invite another admin
  const inviteAdmin = async (email: string): Promise<string> => {
    if (!user || !hasPermission(PERMISSIONS.INVITE_ADMINS)) {
      throw new Error('Unauthorized: Only admins can invite other admins');
    }
    
    try {
      // Generate a secure token
      const token = generateToken({ 
        type: 'admin-invite', 
        email, 
        invitedBy: user.id
      }, 48); // Expires in 48 hours
      
      // Store the invitation
      const invitationsData = await AsyncStorage.getItem(ADMIN_INVITATIONS_KEY);
      const invitations: AdminInvitation[] = invitationsData ? JSON.parse(invitationsData) : [];
      
      // Remove any existing invitations for this email
      const filteredInvitations = invitations.filter(inv => inv.email !== email);
      
      // Add new invitation
      filteredInvitations.push({
        email,
        token,
        expiresAt: Date.now() + (48 * 60 * 60 * 1000), // 48 hours
        createdBy: user.id
      });
      
      await AsyncStorage.setItem(ADMIN_INVITATIONS_KEY, JSON.stringify(filteredInvitations));
      
      // In a real app, you would now send this invitation via email
      // For this demo, we'll just return the token
      console.log(`Admin invitation created for ${email}: ${token}`);
      
      return token;
    } catch (error) {
      console.error('Failed to create admin invitation:', error);
      throw new Error('Failed to create admin invitation');
    }
  };

  // Method to change a user's role (admin only)
  const changeUserRole = async (userId: string, newRole: 'admin' | 'employee'): Promise<void> => {
    if (!user || !hasPermission(PERMISSIONS.ASSIGN_ROLES)) {
      throw new Error('Unauthorized: Only admins can change user roles');
    }

    try {
      const usersData = await AsyncStorage.getItem('users');
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex === -1) {
        throw new Error('User not found');
      }
      
      const oldRole = users[userIndex].role;
      users[userIndex].role = newRole;
      
      // Remove role change request if it exists
      if (users[userIndex].roleChangeRequested) {
        delete users[userIndex].roleChangeRequested;
      }
      
      await AsyncStorage.setItem('users', JSON.stringify(users));
      
      // Log the role change
      await logRoleChange(user.id, userId, oldRole, newRole);
      
      // If the updated user is the current user, update the current user data too
      if (userId === user.id) {
        const updatedCurrentUser = { ...users[userIndex] };
        await AsyncStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));
        
        const { password: _, ...userWithoutPassword } = updatedCurrentUser;
        setUser(userWithoutPassword);
      }
    } catch (error) {
      console.error('Failed to change user role:', error);
      throw error;
    }
  };

  // Method to reject a role change request (admin only)
  const rejectRoleRequest = async (userId: string): Promise<void> => {
    if (!user || !hasPermission(PERMISSIONS.ASSIGN_ROLES)) {
      throw new Error('Unauthorized: Only admins can reject role change requests');
    }

    try {
      const usersData = await AsyncStorage.getItem('users');
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex === -1) {
        throw new Error('User not found');
      }
      
      // Remove the role change request flag
      if (users[userIndex].roleChangeRequested) {
        delete users[userIndex].roleChangeRequested;
      }
      
      // Set rejection timestamp in user data to enforce cooldown
      if (!users[userIndex].roleRequestStatus) {
        users[userIndex].roleRequestStatus = {};
      }
      
      const now = Date.now();
      users[userIndex].roleRequestStatus.lastRejected = now;
      users[userIndex].roleRequestStatus.status = 'rejected';
      
      await AsyncStorage.setItem('users', JSON.stringify(users));
      
      // Create a notification for the rejected employee
      const notification: Notification = {
        id: `notify_${Date.now()}`,
        userId: userId,
        title: 'Role Request Rejected',
        message: 'Your request to become an admin has been rejected. You can request again after 24 hours.',
        timestamp: now,
        read: false,
        type: 'role_request'
      };
      
      await addNotification(notification);
      
      // Log this rejection
      await logRoleChange(user.id, userId, 'employee', 'employee_rejected');
      
    } catch (error) {
      console.error('Failed to reject role request:', error);
      throw error;
    }
  };

  // Method for employees to request admin role - updated with cooldown check
  const requestAdminRole = async (): Promise<void> => {
    if (!user) {
      throw new Error('You must be logged in to request a role change');
    }
    
    if (user.role === 'admin') {
      throw new Error('You are already an admin');
    }
    
    // Check if user can request (24hr cooldown after rejection)
    const canRequest = await canRequestRole();
    if (!canRequest) {
      throw new Error('You cannot request admin role yet. Please wait 24 hours after previous rejection.');
    }
    
    try {
      const usersData = await AsyncStorage.getItem('users');
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      
      const userIndex = users.findIndex(u => u.id === user.id);
      if (userIndex === -1) {
        throw new Error('User not found');
      }
      
      // Mark user as having requested a role change
      users[userIndex].roleChangeRequested = true;
      
      // Update role request status
      if (!users[userIndex].roleRequestStatus) {
        users[userIndex].roleRequestStatus = {};
      }
      
      users[userIndex].roleRequestStatus.lastRequested = Date.now();
      users[userIndex].roleRequestStatus.status = 'pending';
      
      await AsyncStorage.setItem('users', JSON.stringify(users));
      
      // Update current user data
      await AsyncStorage.setItem('currentUser', JSON.stringify(users[userIndex]));
      
      const { password: _, ...userWithoutPassword } = users[userIndex];
      setUser(userWithoutPassword);
      
      // Create notification for admins
      const adminUsers = users.filter(u => u.role === 'admin');
      
      for (const admin of adminUsers) {
        const notification: Notification = {
          id: `notify_${Date.now()}_${admin.id}`,
          userId: admin.id,
          title: 'New Admin Role Request',
          message: `${user.name} has requested to become an admin.`,
          timestamp: Date.now(),
          read: false,
          type: 'approval',
          actionLink: 'roleRequests'
        };
        
        await addNotification(notification);
      }
      
    } catch (error) {
      console.error('Failed to request admin role:', error);
      throw error;
    }
  };

  // Helper to check if a user can request role again (24hr cooldown)
  const canRequestRole = async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const usersData = await AsyncStorage.getItem('users');
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      
      const currentUser = users.find(u => u.id === user.id);
      if (!currentUser) return true;
      
      const roleRequestStatus = currentUser.roleRequestStatus;
      
      if (!roleRequestStatus || !roleRequestStatus.lastRejected) {
        return true;
      }
      
      // Check if 24 hours have passed since last rejection
      const now = Date.now();
      const lastRejected = roleRequestStatus.lastRejected;
      const hoursSinceRejection = (now - lastRejected) / (1000 * 60 * 60);
      
      return hoursSinceRejection >= 24;
    } catch (error) {
      console.error('Error checking if user can request role:', error);
      return false;
    }
  };

  const updateUser = async (userData: User) => {
    try {
      if (!user) {
        throw new Error('No user logged in');
      }
      
      // Update in users list
      const usersData = await AsyncStorage.getItem('users');
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      
      // Find user index in array
      const currentUserIndex = users.findIndex(u => u.email === user.email);
      
      if (currentUserIndex === -1) {
        throw new Error('User not found');
      }
      
      // Preserve password from the original user
      const password = users[currentUserIndex].password;
      
      // Ensure role cannot be changed through this method
      if (userData.role !== users[currentUserIndex].role && !hasPermission(PERMISSIONS.ASSIGN_ROLES)) {
        throw new Error('Unauthorized: You cannot change user roles');
      }
      
      // Update user data but keep password
      const updatedUser: StoredUser = {
        ...userData,
        password
      };
      
      // Update in users array
      users[currentUserIndex] = updatedUser;
      await AsyncStorage.setItem('users', JSON.stringify(users));
      
      // Update current user in AsyncStorage
      await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
      
      // Update in state (without password)
      const { password: _, ...userWithoutPassword } = updatedUser;
      setUser(userWithoutPassword);
    } catch (error) {
      console.error('Failed to update user data:', error);
      throw error;
    }
  };

  // New function to reset all stored data for troubleshooting
  const resetStoredData = async () => {
    try {
      await AsyncStorage.removeItem('users');
      await AsyncStorage.removeItem('currentUser');
      await AsyncStorage.removeItem(ADMIN_INVITATIONS_KEY);
      await AsyncStorage.removeItem(ROLE_CHANGE_REQUESTS_KEY);
      await AsyncStorage.removeItem(AUDIT_LOGS_KEY);
      
      // Create default admin again
      const adminUser: StoredUser = {
        id: 'admin',
        email: 'admin@onsite.com',
        password: 'admin123',
        name: 'Admin',
        role: 'admin',
        department: 'Admin',
      };
      
      await AsyncStorage.setItem('users', JSON.stringify([adminUser]));
      setUser(null);
      
      Alert.alert(
        'Data Reset',
        'All user data has been reset. Default admin account is admin@onsite.com / admin123',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error resetting data:', error);
      Alert.alert('Error', 'Failed to reset data');
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('currentUser');
      setUser(null);
      // No navigation here - let the AppNavigator handle routing based on user state
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Helper function to add a notification
  const addNotification = async (notification: Notification): Promise<void> => {
    try {
      const notificationsData = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      const notifications: Notification[] = notificationsData ? JSON.parse(notificationsData) : [];
      
      notifications.push(notification);
      
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('Failed to add notification:', error);
    }
  };

  // Toggle notification settings
  const toggleNotifications = async (enabled: boolean): Promise<void> => {
    if (!user) {
      throw new Error('You must be logged in to update notification settings');
    }
    
    try {
      const usersData = await AsyncStorage.getItem('users');
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      
      const userIndex = users.findIndex(u => u.id === user.id);
      if (userIndex === -1) {
        throw new Error('User not found');
      }
      
      // Initialize notification settings if not exist
      if (!users[userIndex].notificationSettings) {
        users[userIndex].notificationSettings = {
          enabled: enabled,
          attendanceReminders: enabled,
          approvalAlerts: enabled,
          systemUpdates: enabled
        };
      } else {
        // Just update the main enabled flag
        users[userIndex].notificationSettings.enabled = enabled;
      }
      
      await AsyncStorage.setItem('users', JSON.stringify(users));
      
      // Update current user
      await AsyncStorage.setItem('currentUser', JSON.stringify(users[userIndex]));
      
      const { password: _, ...userWithoutPassword } = users[userIndex];
      setUser(userWithoutPassword);
      
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
      throw error;
    }
  };

  // Update detailed notification settings
  const updateNotificationSettings = async (settings: User['notificationSettings']): Promise<void> => {
    if (!user) {
      throw new Error('You must be logged in to update notification settings');
    }
    
    try {
      const usersData = await AsyncStorage.getItem('users');
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      
      const userIndex = users.findIndex(u => u.id === user.id);
      if (userIndex === -1) {
        throw new Error('User not found');
      }
      
      // Update notification settings
      users[userIndex].notificationSettings = settings;
      
      await AsyncStorage.setItem('users', JSON.stringify(users));
      
      // Update current user
      await AsyncStorage.setItem('currentUser', JSON.stringify(users[userIndex]));
      
      const { password: _, ...userWithoutPassword } = users[userIndex];
      setUser(userWithoutPassword);
      
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      throw error;
    }
  };

  // Get user's notifications
  const getNotifications = async (): Promise<Notification[]> => {
    if (!user) {
      return [];
    }
    
    try {
      const notificationsData = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      const notifications: Notification[] = notificationsData ? JSON.parse(notificationsData) : [];
      
      // Filter notifications for this user
      return notifications.filter(n => n.userId === user.id)
        .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first
      
    } catch (error) {
      console.error('Failed to get notifications:', error);
      return [];
    }
  };

  // Mark a notification as read
  const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    if (!user) {
      throw new Error('You must be logged in to update notifications');
    }
    
    try {
      const notificationsData = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      const notifications: Notification[] = notificationsData ? JSON.parse(notificationsData) : [];
      
      const notificationIndex = notifications.findIndex(n => n.id === notificationId && n.userId === user.id);
      
      if (notificationIndex !== -1) {
        notifications[notificationIndex].read = true;
        await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
      }
      
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  };

  // Method to get all role change requests (admin only)
  const getRoleRequests = async (): Promise<{id: string, email: string, name: string, lastRequested: number}[]> => {
    if (!user || !hasPermission(PERMISSIONS.ASSIGN_ROLES)) {
      throw new Error('Unauthorized: Only admins can view role change requests');
    }
    
    try {
      const usersData = await AsyncStorage.getItem('users');
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      
      const requests = users
        .filter(u => u.roleChangeRequested)
        .map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          lastRequested: u.roleRequestStatus?.lastRequested || Date.now()
        }));
      
      return requests;
    } catch (error) {
      console.error('Failed to get role requests:', error);
      throw error;
    }
  };

  // Method to approve a role change request (admin only)
  const approveRoleRequest = async (userId: string): Promise<void> => {
    if (!user || !hasPermission(PERMISSIONS.ASSIGN_ROLES)) {
      throw new Error('Unauthorized: Only admins can approve role change requests');
    }
    
    try {
      // First approve the role change
      await changeUserRole(userId, 'admin');
      
      // Then send a notification to the user
      const usersData = await AsyncStorage.getItem('users');
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      
      const approvedUser = users.find(u => u.id === userId);
      
      if (approvedUser) {
        // Update their role request status
        if (!approvedUser.roleRequestStatus) {
          approvedUser.roleRequestStatus = {};
        }
        
        approvedUser.roleRequestStatus.status = 'approved';
        await AsyncStorage.setItem('users', JSON.stringify(users));
        
        // Send notification
        const notification: Notification = {
          id: `notify_${Date.now()}`,
          userId: userId,
          title: 'Role Request Approved',
          message: 'Your request to become an admin has been approved. You now have admin privileges.',
          timestamp: Date.now(),
          read: false,
          type: 'role_request'
        };
        
        await addNotification(notification);
      }
    } catch (error) {
      console.error('Failed to approve role request:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: !!user,
        inviteAdmin,
        changeUserRole,
        getRoleRequests,
        approveRoleRequest,
        rejectRoleRequest,
        requestAdminRole,
        hasPermission,
        resetStoredData,
        canRequestRole,
        toggleNotifications,
        updateNotificationSettings,
        getNotifications,
        markNotificationAsRead,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 