import React, { useState, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform, Alert, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, TextInput, Button, Card, Snackbar, ActivityIndicator, useTheme as usePaperTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

const LoginScreen: React.FC<{ navigation: NativeStackNavigationProp<any> }> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [userMessage, setUserMessage] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', error: false });
  const { login, resetStoredData } = useAuth();
  const { theme } = useTheme();
  const paperTheme = usePaperTheme();

  useEffect(() => {
    const checkStoredUsers = async () => {
      try {
        const usersData = await AsyncStorage.getItem('users');
        const users = usersData ? JSON.parse(usersData) : [];
        if (users.length === 0) {
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
      } catch (error) {
        setSnackbar({ visible: true, message: 'Error checking users', error: true });
      }
    };
    checkStoredUsers();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setSnackbar({ visible: true, message: 'Please fill in all fields', error: true });
      return;
    }
    setIsLoggingIn(true);
    try {
      await login(email, password);
    } catch (error: any) {
      setSnackbar({ visible: true, message: error.message || 'Login failed', error: true });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset App Data',
      'This will clear all user accounts and create a fresh admin account. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', onPress: resetStoredData, style: 'destructive' },
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
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <LinearGradient
        colors={[theme.primary, theme.primaryLight]}
        style={{ paddingTop: 80, paddingBottom: 40, alignItems: 'center', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
      >
        <Text variant="headlineLarge" style={{ color: theme.card, fontWeight: 'bold', marginBottom: 8 }}>OnSite</Text>
        <Text variant="titleMedium" style={{ color: theme.card, opacity: 0.8 }}>Attendance Tracking</Text>
      </LinearGradient>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <Card style={{ borderRadius: 18, padding: 18, backgroundColor: theme.card, elevation: 4 }}>
          <Card.Title title="Welcome Back" titleStyle={{ color: theme.text, fontWeight: 'bold' }} subtitle="Sign in to your account" subtitleStyle={{ color: theme.textSecondary }} />
          {userMessage ? (
            <Text style={{ color: paperTheme.colors.primary, marginBottom: 8 }}>{userMessage}</Text>
          ) : null}
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            left={<TextInput.Icon icon="email-outline" />}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ marginBottom: 16, backgroundColor: theme.inputBackground || theme.card, borderRadius: 8 }}
            mode="outlined"
            autoComplete="email"
            theme={{ colors: { placeholder: '#fff', text: theme.text, background: theme.inputBackground || theme.card, primary: '#fff', outline: '#fff' } }}
          />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            left={<TextInput.Icon icon="lock-outline" />}
            right={<TextInput.Icon icon={secureTextEntry ? 'eye-off-outline' : 'eye-outline'} onPress={() => setSecureTextEntry(!secureTextEntry)} />}
            secureTextEntry={secureTextEntry}
            style={{ marginBottom: 16, backgroundColor: theme.inputBackground || theme.card, borderRadius: 8 }}
            mode="outlined"
            autoComplete="password"
            theme={{ colors: { placeholder: '#fff', text: theme.text, background: theme.inputBackground || theme.card, primary: '#fff', outline: '#fff' } }}
          />
          <Button
            mode="contained"
            onPress={handleLogin}
            loading={isLoggingIn}
            disabled={isLoggingIn}
            style={{ marginBottom: 12, borderRadius: 8 }}
            icon="login"
            contentStyle={{ paddingVertical: 6 }}
          >
            Sign In
          </Button>
          <Button
            mode="text"
            onPress={useDefaultAdmin}
            style={{ marginBottom: 8 }}
            icon="account"
          >
            Use Default Admin
          </Button>
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Register')}
            style={{ marginBottom: 8, borderRadius: 8 }}
            icon="account-plus-outline"
          >
            Register
          </Button>
          <Button
            mode="text"
            onPress={handleResetData}
            style={{ marginBottom: 8 }}
            icon="backup-restore"
            textColor={paperTheme.colors.error}
          >
            Reset App Data
          </Button>
        </Card>
      </View>
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
        style={{ backgroundColor: snackbar.error ? paperTheme.colors.error : paperTheme.colors.primary }}
      >
        {snackbar.message}
      </Snackbar>
      {isLoggingIn && <ActivityIndicator animating={true} size="large" style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -24, marginTop: -24 }} />}
    </KeyboardAvoidingView>
  );
};

export default LoginScreen; 