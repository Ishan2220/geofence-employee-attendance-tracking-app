import React, { useState, useCallback } from 'react';
import { View, KeyboardAvoidingView, Platform, Keyboard, ScrollView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, TextInput, Button, Card, Snackbar, ActivityIndicator, Switch, useTheme as usePaperTheme } from 'react-native-paper';

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  department: string;
  inviteToken: string;
}

const RegisterScreen: React.FC<{ navigation: NativeStackNavigationProp<any> }> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const paperTheme = usePaperTheme();
  const [formState, setFormState] = useState<FormState>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    department: '',
    inviteToken: '',
  });
  const [hasInvitation, setHasInvitation] = useState(false);
  const { register } = useAuth();
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [secureConfirmTextEntry, setSecureConfirmTextEntry] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', error: false });

  const updateFormField = useCallback((field: keyof FormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleRegister = useCallback(async () => {
    Keyboard.dismiss();
    const { email, password, confirmPassword, name, department, inviteToken } = formState;
    if (!email || !password || !confirmPassword || !name || !department) {
      setSnackbar({ visible: true, message: 'Please fill in all required fields', error: true });
      return;
    }
    if (password !== confirmPassword) {
      setSnackbar({ visible: true, message: 'Passwords do not match', error: true });
      return;
    }
    if (hasInvitation && !inviteToken) {
      setSnackbar({ visible: true, message: 'Please enter your admin invitation token', error: true });
      return;
    }
    setIsLoading(true);
    try {
      const token = hasInvitation ? inviteToken : undefined;
      await register(email, password, { name, department }, token);
      setSnackbar({ visible: true, message: 'Registration successful! Please log in.', error: false });
      setTimeout(() => navigation.navigate('Login'), 1200);
    } catch (error: any) {
      setSnackbar({ visible: true, message: error.message || 'Registration failed', error: true });
    } finally {
      setIsLoading(false);
    }
  }, [formState, register, navigation, hasInvitation]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <LinearGradient
        colors={[theme.primary, theme.primaryLight]}
        style={{ paddingTop: 80, paddingBottom: 40, alignItems: 'center', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
      >
        <Text variant="headlineLarge" style={{ color: theme.card, fontWeight: 'bold', marginBottom: 8 }}>Register</Text>
        <Text variant="titleMedium" style={{ color: theme.card, opacity: 0.8 }}>Create your account</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
        <Card style={{ borderRadius: 18, padding: 18, backgroundColor: theme.card, elevation: 4 }}>
          <Card.Title title="Sign Up" titleStyle={{ color: theme.text, fontWeight: 'bold' }} subtitle="Enter your details" subtitleStyle={{ color: theme.textSecondary }} />
          <TextInput
            label="Full Name"
            value={formState.name}
            onChangeText={v => updateFormField('name', v)}
            left={<TextInput.Icon icon="account-outline" />}
            style={{ marginBottom: 16, backgroundColor: theme.inputBackground || theme.card, borderRadius: 8 }}
            mode="outlined"
            autoComplete="name"
            theme={{ colors: { placeholder: '#fff', text: theme.text, background: theme.inputBackground || theme.card, primary: '#fff', outline: '#fff' } }}
          />
          <TextInput
            label="Department"
            value={formState.department}
            onChangeText={v => updateFormField('department', v)}
            left={<TextInput.Icon icon="office-building-outline" />}
            style={{ marginBottom: 16, backgroundColor: theme.inputBackground || theme.card, borderRadius: 8 }}
            mode="outlined"
            autoComplete="organization"
            theme={{ colors: { placeholder: '#fff', text: theme.text, background: theme.inputBackground || theme.card, primary: '#fff', outline: '#fff' } }}
          />
          <TextInput
            label="Email"
            value={formState.email}
            onChangeText={v => updateFormField('email', v)}
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
            value={formState.password}
            onChangeText={v => updateFormField('password', v)}
            left={<TextInput.Icon icon="lock-outline" />}
            right={<TextInput.Icon icon={secureTextEntry ? 'eye-off-outline' : 'eye-outline'} onPress={() => setSecureTextEntry(!secureTextEntry)} />}
            secureTextEntry={secureTextEntry}
            style={{ marginBottom: 16, backgroundColor: theme.inputBackground || theme.card, borderRadius: 8 }}
            mode="outlined"
            autoComplete="password"
            theme={{ colors: { placeholder: '#fff', text: theme.text, background: theme.inputBackground || theme.card, primary: '#fff', outline: '#fff' } }}
          />
          <TextInput
            label="Confirm Password"
            value={formState.confirmPassword}
            onChangeText={v => updateFormField('confirmPassword', v)}
            left={<TextInput.Icon icon="lock-outline" />}
            right={<TextInput.Icon icon={secureConfirmTextEntry ? 'eye-off-outline' : 'eye-outline'} onPress={() => setSecureConfirmTextEntry(!secureConfirmTextEntry)} />}
            secureTextEntry={secureConfirmTextEntry}
            style={{ marginBottom: 16, backgroundColor: theme.inputBackground || theme.card, borderRadius: 8 }}
            mode="outlined"
            autoComplete="password"
            theme={{ colors: { placeholder: '#fff', text: theme.text, background: theme.inputBackground || theme.card, primary: '#fff', outline: '#fff' } }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Switch value={hasInvitation} onValueChange={setHasInvitation} color={theme.primary} />
            <Text style={{ marginLeft: 8, color: theme.text }}>I have an admin invitation token</Text>
          </View>
          {hasInvitation && (
            <TextInput
              label="Invitation Token"
              value={formState.inviteToken}
              onChangeText={v => updateFormField('inviteToken', v)}
              left={<TextInput.Icon icon="key-outline" />}
              style={{ marginBottom: 16, backgroundColor: theme.inputBackground || theme.card, borderRadius: 8 }}
              mode="outlined"
              autoComplete="off"
              theme={{ colors: { placeholder: '#fff', text: theme.text, background: theme.inputBackground || theme.card, primary: '#fff', outline: '#fff' } }}
            />
          )}
          <Button
            mode="contained"
            onPress={handleRegister}
            loading={isLoading}
            disabled={isLoading}
            style={{ marginBottom: 12, borderRadius: 8 }}
            icon="account-plus-outline"
            contentStyle={{ paddingVertical: 6 }}
          >
            Register
          </Button>
          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
            style={{ marginBottom: 8 }}
            icon="login"
          >
            Already have an account? Login
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

export default RegisterScreen; 