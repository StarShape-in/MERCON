import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Button, Input } from '../../components';
import { useAuth } from '../../lib/auth-context';
import { api, getApiErrorMessage } from '../../lib/api';

const LoginScreen = () => {
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [license, setLicense] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleForgot = async () => {
    setError(null);
    setNotice(null);
    if (!phone.trim()) {
      setError('Enter your mobile number first, then tap "Can\'t log in?" again.');
      return;
    }
    try {
      // Notifies all operators/admins that this driver needs a reset.
      await api.post('/auth/request-reset', { identifier: `Driver ${phone.trim()}` });
      setNotice('Your operator has been notified. They will help you log in.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleSignIn = async () => {
    if (!phone.trim() || !license.trim()) {
      setError('Please enter your phone number and license number.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signIn(phone.trim(), license.trim());
      // Success: the auth guard in app/_layout.tsx switches to the home screen.
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoSection}>
          <View style={styles.logoBox}>
            {/* TODO: replace icon placeholders with lucide-react-native */}
            <Text style={styles.logoIcon}>🚛</Text>
          </View>
          <Text style={styles.brand}>MERCON</Text>
          <Text style={styles.brandSub}>Logistics Platform</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Welcome Back</Text>
          <Text style={styles.subheading}>Sign in to your driver account</Text>

          <View style={styles.form}>
            <Input
              label="Mobile Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+9665XXXXXXXX"
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
            <Input
              label="License Number"
              value={license}
              onChangeText={setLicense}
              placeholder="Enter your license number"
              autoCapitalize="characters"
              secureTextEntry
            />

            {error && <Text style={styles.errorText}>{error}</Text>}
            {notice && <Text style={styles.noticeText}>{notice}</Text>}

            <Button
              title={loading ? 'Signing In...' : 'Sign In'}
              onPress={handleSignIn}
              disabled={loading}
            />

            <TouchableOpacity onPress={handleForgot} activeOpacity={0.7} style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Can't log in? Notify my operator</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footer}>
          Having trouble? Contact{' '}
          <Text style={styles.footerLink}>support@mercon.sa</Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray100,
  },
  scroll: {
    flexGrow: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  logoIcon: {
    fontSize: 32,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.gray900,
    letterSpacing: 4,
  },
  brandSub: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadows.md,
  },
  heading: {
    fontSize: Typography['2xl'],
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  subheading: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    marginBottom: Spacing.xl,
  },
  form: {
    gap: Spacing.md,
  },
  errorText: {
    fontSize: Typography.sm,
    color: '#DC2626',
    marginTop: -Spacing.xs,
  },
  noticeText: {
    fontSize: Typography.sm,
    color: Colors.success,
    marginTop: -Spacing.xs,
  },
  forgotBtn: {
    alignSelf: 'center',
    marginTop: Spacing.sm,
  },
  forgotText: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    fontSize: Typography.xs,
    color: Colors.gray500,
    marginTop: Spacing.xl,
  },
  footerLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default LoginScreen;
