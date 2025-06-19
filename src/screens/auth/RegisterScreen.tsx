import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Dimensions,
  Keyboard,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

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

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  department: string;
  inviteToken: string;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Add keyboard event listeners to avoid screen shift
  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const updateFormField = useCallback((field: keyof FormState, value: string) => {
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleRegister = useCallback(async () => {
    // Dismiss keyboard when submitting
    Keyboard.dismiss();
    
    const { email, password, confirmPassword, name, department, inviteToken } = formState;

    try {
      if (!email || !password || !confirmPassword || !name || !department) {
        Alert.alert('Missing Information', 'Please fill in all required fields');
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch', 'Passwords do not match. Please check and try again.');
        return;
      }

      // Validate invitation token format if user claims to have one
      if (hasInvitation && !inviteToken) {
        Alert.alert('Token Required', 'Please enter your admin invitation token');
        return;
      }

      console.log('Registering with invitation:', hasInvitation ? 'Yes' : 'No');
      console.log('Invitation token:', hasInvitation ? inviteToken : 'None');

      // Only pass the invitation token if the user has checked the box
      const token = hasInvitation ? inviteToken : undefined;

      await register(
        email, 
        password, 
        {
          name,
          department
          // No role specified - role will be determined by backend logic
        }, 
        token // Pass token only when hasInvitation is true
      );
      
      // On successful registration, just show an alert and return to login
      // The AuthContext will automatically set the user and trigger navigation
      Alert.alert(
        'Registration Successful', 
        'Your account has been created successfully',
        [
          {
            text: 'Continue to Login',
            onPress: () => {
              // The main app navigation will happen automatically through the auth context
              // when the user is set, but we can navigate back to login just in case
              navigation.navigate('Login');
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'An error occurred during registration');
    }
  }, [formState, register, navigation, hasInvitation]);

  const navigateToLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  const renderInput = useCallback(({ 
    field, 
    placeholder, 
    secureTextEntry = false,
    autoCapitalize = 'none',
    keyboardType = 'default',
    icon,
    rightAction = null
  }: {
    field: keyof FormState;
    placeholder: string;
    secureTextEntry?: boolean;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
    icon: React.ReactNode;
    rightAction?: React.ReactNode;
  }) => (
    <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(17, 24, 39, 0.8)' : COLORS.background }]}>
      {icon}
      <TextInput
        style={[styles.input, { color: COLORS.text }]}
        placeholder={placeholder}
        value={formState[field]}
        onChangeText={(value) => updateFormField(field, value)}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        autoCorrect={false}
        placeholderTextColor={COLORS.placeholder}
      />
      {rightAction}
    </View>
  ), [formState, updateFormField, isDark]);

  // Calculate styles that depend on state
  const invitationSectionStyle = {
    ...styles.invitationSection,
    backgroundColor: hasInvitation 
      ? isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)'
      : isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(229, 231, 235, 0.5)',
    borderColor: hasInvitation ? COLORS.primary : COLORS.border,
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: isDark ? '#111827' : COLORS.background }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <View style={styles.contentWrapper}>
        <LinearGradient
          colors={['#3B82F6', '#2563EB']}
          style={styles.header}
        >
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>OnSite</Text>
            <Text style={styles.logoTagline}>Attendance Management</Text>
          </View>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.formContainer, { backgroundColor: isDark ? '#1F2937' : COLORS.card }]}>
            <Text style={[styles.title, { color: isDark ? '#F9FAFB' : COLORS.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: isDark ? '#D1D5DB' : COLORS.textSecondary }]}>
              Join OnSite to start managing your attendance
            </Text>

            {renderInput({
              field: 'name',
              placeholder: 'Full Name',
              autoCapitalize: 'words',
              icon: <Ionicons name="person-outline" size={20} color={isDark ? '#D1D5DB' : COLORS.textSecondary} style={styles.inputIcon} />
            })}

            {renderInput({
              field: 'email',
              placeholder: 'Work Email',
              keyboardType: 'email-address',
              icon: <Ionicons name="mail-outline" size={20} color={isDark ? '#D1D5DB' : COLORS.textSecondary} style={styles.inputIcon} />
            })}

            {renderInput({
              field: 'department',
              placeholder: 'Department',
              autoCapitalize: 'words',
              icon: <Ionicons name="business-outline" size={20} color={isDark ? '#D1D5DB' : COLORS.textSecondary} style={styles.inputIcon} />
            })}

            {/* Account Type Section */}
            <View style={invitationSectionStyle}>
              <Text style={[styles.invitationSectionTitle, { color: isDark ? '#F9FAFB' : COLORS.text }]}>Account Type</Text>
              
              <View style={styles.accountTypeContainer}>
                <View style={styles.accountTypeOption}>
                  <View style={[
                    styles.checkbox,
                    !hasInvitation ? styles.checkboxActive : styles.checkboxInactive,
                    !hasInvitation && !isDark ? { borderColor: COLORS.primary } : {},
                    !hasInvitation && isDark ? { borderColor: COLORS.primary } : {},
                    isDark && hasInvitation ? { borderColor: '#4B5563' } : {}
                  ]}>
                    {!hasInvitation && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                  <Text style={[styles.accountTypeText, { color: isDark ? '#F9FAFB' : COLORS.text }]}>Employee Account</Text>
                </View>
                
                <TouchableOpacity
                  style={styles.invitationToggle}
                  onPress={() => setHasInvitation(!hasInvitation)}
                >
                  <View style={[
                    styles.checkbox,
                    hasInvitation ? styles.checkboxActive : styles.checkboxInactive,
                    hasInvitation && !isDark ? { borderColor: COLORS.primary } : {},
                    hasInvitation && isDark ? { borderColor: COLORS.primary } : {},
                    isDark && !hasInvitation ? { borderColor: '#4B5563' } : {}
                  ]}>
                    {hasInvitation && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                  <Text style={[styles.accountTypeText, { color: isDark ? '#F9FAFB' : COLORS.text }]}>Admin (Invitation Only)</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.invitationHelper, { color: isDark ? '#D1D5DB' : COLORS.textSecondary }]}>
                {hasInvitation 
                  ? "You'll need a valid invitation token to register as an admin." 
                  : "You'll register as an employee. Contact an existing admin for admin access."}
              </Text>
            </View>

            {/* Invitation token input (only displayed if user has invitation) */}
            {hasInvitation && (
              <View style={styles.tokenContainer}>
                {renderInput({
                  field: 'inviteToken',
                  placeholder: 'Admin Invitation Token',
                  icon: <Ionicons name="key-outline" size={20} color={isDark ? '#D1D5DB' : COLORS.textSecondary} style={styles.inputIcon} />
                })}
                <Text style={[styles.tokenHelper, { color: isDark ? '#D1D5DB' : COLORS.textSecondary }]}>
                  This token must be generated by an existing admin
                </Text>
              </View>
            )}

            {renderInput({
              field: 'password',
              placeholder: 'Password',
              secureTextEntry: secureTextEntry,
              icon: <Ionicons name="lock-closed-outline" size={20} color={isDark ? '#D1D5DB' : COLORS.textSecondary} style={styles.inputIcon} />,
              rightAction: 
                <TouchableOpacity 
                  style={styles.eyeIcon} 
                  onPress={() => setSecureTextEntry(!secureTextEntry)}
                >
                  <Ionicons 
                    name={secureTextEntry ? "eye-outline" : "eye-off-outline"} 
                    size={20} 
                    color={isDark ? '#D1D5DB' : COLORS.textSecondary} 
                  />
                </TouchableOpacity>
            })}

            {renderInput({
              field: 'confirmPassword',
              placeholder: 'Confirm Password',
              secureTextEntry: secureConfirmTextEntry,
              icon: <Ionicons name="lock-closed-outline" size={20} color={isDark ? '#D1D5DB' : COLORS.textSecondary} style={styles.inputIcon} />,
              rightAction: 
                <TouchableOpacity 
                  style={styles.eyeIcon} 
                  onPress={() => setSecureConfirmTextEntry(!secureConfirmTextEntry)}
                >
                  <Ionicons 
                    name={secureConfirmTextEntry ? "eye-outline" : "eye-off-outline"} 
                    size={20} 
                    color={isDark ? '#D1D5DB' : COLORS.textSecondary} 
                  />
                </TouchableOpacity>
            })}

            <TouchableOpacity 
              style={styles.buttonContainer} 
              onPress={handleRegister}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                <Ionicons 
                  name={hasInvitation ? "person-add" : "person"} 
                  size={18} 
                  color="#fff" 
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.buttonText}>Register as {hasInvitation ? 'Admin' : 'Employee'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={[styles.loginText, { color: isDark ? '#D1D5DB' : COLORS.textSecondary }]}>
                Already have an account?
              </Text>
              <TouchableOpacity onPress={navigateToLogin}>
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  header: {
    height: 140, // Reduced height for the header
    width: '100%',
    paddingTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  logoTagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  formContainer: {
    marginTop: -30,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 32,
    marginHorizontal: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 54,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 54,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 8,
  },
  invitationSection: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  invitationSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 14,
  },
  accountTypeContainer: {
    marginBottom: 10,
  },
  accountTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  invitationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxInactive: {
    backgroundColor: 'transparent',
    borderColor: COLORS.border,
  },
  accountTypeText: {
    fontSize: 15,
    fontWeight: '500',
  },
  invitationHelper: {
    fontSize: 13,
    marginTop: 4,
    fontStyle: 'italic',
  },
  tokenContainer: {
    marginBottom: 16,
  },
  tokenHelper: {
    fontSize: 13,
    marginTop: -8,
    marginBottom: 14,
    marginLeft: 14,
    fontStyle: 'italic',
  },
  invitationText: {
    fontSize: 15,
  },
  buttonContainer: {
    marginTop: 12,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  button: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 15,
  },
  loginLink: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 5,
  },
});

export default RegisterScreen; 