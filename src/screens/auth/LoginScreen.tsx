import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  shadow: 'rgba(0, 0, 0, 0.08)' // Shadow color
};

const { width } = Dimensions.get('window');

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [userMessage, setUserMessage] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login, resetStoredData, loading } = useAuth();

  // Add debug function to check stored users when screen loads
  useEffect(() => {
    const checkStoredUsers = async () => {
      try {
        const usersData = await AsyncStorage.getItem('users');
        const users = usersData ? JSON.parse(usersData) : [];
        console.log(`DEBUG: Found ${users.length} users in storage`);
        if (users.length > 0) {
          console.log('DEBUG: Sample user emails:');
          users.forEach((user: any, idx: number) => {
            console.log(`User ${idx}: ${user.email}, Role: ${user.role}`);
          });
        } else {
          console.log('DEBUG: No users found in storage');
          // If no users, make sure admin account exists
          const adminExists = users.some((u: any) => u.role === 'admin');
          if (!adminExists) {
            console.log('DEBUG: Creating default admin account');
            const adminUser = {
              id: 'admin',
              email: 'admin@onsite.com',
              password: 'admin123',
              name: 'Admin',
              role: 'admin',
              department: 'Admin',
            };
            await AsyncStorage.setItem('users', JSON.stringify([adminUser]));
            setUserMessage('Default admin account was created: admin@onsite.com / admin123');
          }
        }
      } catch (error) {
        console.error('Error checking users:', error);
      }
    };
    
    checkStoredUsers();
  }, []);

  const handleLogin = async () => {
    try {
      if (!email || !password) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }
      
      setIsLoggingIn(true);
      console.log('Login attempt:', { email, passwordLength: password.length });
      
      // Set a more specific error message
      try {
        console.log('Calling login function from AuthContext...');
        await login(email, password);
        console.log('Logged in successfully');
        
        // No need to navigate - the AppNavigator will handle that based on auth state
      } catch (error: any) {
        console.error('Login error caught:', error.message || 'Unknown error');
        
        // Check if users exist with this email first
        const usersData = await AsyncStorage.getItem('users');
        const users = usersData ? JSON.parse(usersData) : [];
        console.log('Available users:', users.length);
        
        const userWithEmail = users.find((u: any) => u.email === email);
        console.log('Found user with email:', userWithEmail ? 'Yes' : 'No');
        
        if (!userWithEmail) {
          Alert.alert('Login Failed', `No account found with email: ${email}`);
        } else if (userWithEmail.password !== password) {
          console.log('Password mismatch:', { 
            storedLength: userWithEmail.password.length, 
            inputLength: password.length 
          });
          Alert.alert('Login Failed', 'Incorrect password. Please try again.');
        } else {
          Alert.alert('Login Error', error.message || 'Something went wrong during login');
        }
      }
    } catch (error: any) {
      console.error('Unexpected error during login:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset App Data',
      'This will clear all user accounts and create a fresh admin account. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Reset',
          onPress: resetStoredData,
          style: 'destructive'
        }
      ]
    );
  };

  const useDefaultAdmin = () => {
    setEmail('admin@onsite.com');
    setPassword('admin123');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={['#3B82F6', '#2563EB']}
        style={styles.header}
      >
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>OnSite</Text>
        </View>
      </LinearGradient>

      <View style={styles.formContainer}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        {userMessage ? (
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>{userMessage}</Text>
          </View>
        ) : null}

        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.placeholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={COLORS.placeholder}
            value={password}
            onChangeText={text => {
              console.log('Password changed, new length:', text.length);
              setPassword(text);
            }}
            secureTextEntry={secureTextEntry}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
          />
          <TouchableOpacity 
            style={styles.eyeIcon} 
            onPress={() => setSecureTextEntry(!secureTextEntry)}
          >
            <Ionicons 
              name={secureTextEntry ? "eye-outline" : "eye-off-outline"} 
              size={20} 
              color={COLORS.textSecondary} 
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.buttonContainer, isLoggingIn && styles.disabledButton]} 
          onPress={handleLogin}
          disabled={isLoggingIn || loading}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            {isLoggingIn ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.defaultAdminButton} onPress={useDefaultAdmin}>
          <Text style={styles.defaultAdminText}>Use Default Admin</Text>
        </TouchableOpacity>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerText}>
              Don't have an account? <Text style={styles.registerLink}>Register</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetButton} onPress={handleResetData}>
            <Text style={styles.resetButtonText}>Reset App Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.resetButton, { marginTop: 10 }]} 
            onPress={() => {
              AsyncStorage.clear().then(() => {
                Alert.alert('Storage Cleared', 'All app data cleared. Please restart the app.');
              });
            }}
          >
            <Text style={[styles.resetButtonText, { color: COLORS.error }]}>Force Clear Storage</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.resetButton, { marginTop: 10 }]} 
            onPress={async () => {
              try {
                // Get all storage keys
                const keys = await AsyncStorage.getAllKeys();
                console.log('Available AsyncStorage keys:', keys);
                
                // Check current user
                const currentUser = await AsyncStorage.getItem('currentUser');
                console.log('Current User:', currentUser ? JSON.parse(currentUser) : 'None');
                
                // Check all users
                const users = await AsyncStorage.getItem('users');
                console.log('All Users:', users ? JSON.parse(users) : 'None');
                
                // Try to fix any issues
                if (currentUser) {
                  const parsedUser = JSON.parse(currentUser);
                  const allUsers = users ? JSON.parse(users) : [];
                  
                  // Force the current user to be in the users array
                  if (allUsers.length > 0 && !allUsers.some(u => u.id === parsedUser.id)) {
                    allUsers.push(parsedUser);
                    await AsyncStorage.setItem('users', JSON.stringify(allUsers));
                    console.log('Fixed: Added current user to users array');
                  }
                }
                
                Alert.alert('Debug Complete', 'Check console for storage details');
              } catch (e) {
                console.error('Debug Error:', e);
                Alert.alert('Debug Error', String(e));
              }
            }}
          >
            <Text style={[styles.resetButtonText, { color: COLORS.accent }]}>Debug Storage</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.card,
  },
  formContainer: {
    flex: 1,
    marginTop: -30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: COLORS.background,
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  messageContainer: {
    backgroundColor: COLORS.primaryDark + '10',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  messageText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 15,
    marginBottom: 20,
    paddingHorizontal: 15,
    paddingVertical: 3,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    color: COLORS.text,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  buttonContainer: {
    borderRadius: 15,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  button: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: COLORS.card,
    fontSize: 16,
    fontWeight: '600',
  },
  defaultAdminButton: {
    alignItems: 'center',
    marginTop: 15,
    padding: 8,
  },
  defaultAdminText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  optionsContainer: {
    marginTop: 10,
  },
  registerButton: {
    marginTop: 10,
    alignItems: 'center',
  },
  registerText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  registerLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  resetButton: {
    marginTop: 20,
    padding: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 14,
    color: COLORS.error,
  },
  disabledButton: {
    opacity: 0.7,
  },
});

export default LoginScreen; 