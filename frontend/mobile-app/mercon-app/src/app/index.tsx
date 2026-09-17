import { Redirect } from 'expo-router';
import DriverHomeScreen from '@/screens/driver/HomeScreen';
import OperatorHomeScreen from '@/screens/operator/HomeScreen';
import { useAuth } from '@/lib/auth-context';

export default function Index() {
  const { isLoggedIn, role } = useAuth();
  if (!isLoggedIn) {
    return <Redirect href="/login" />;
  }
  if (role === 'Driver') {
    return <DriverHomeScreen />;
  }
  return <OperatorHomeScreen />;
}

