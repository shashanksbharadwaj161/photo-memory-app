import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function AuthLayout() {
  const { user, bookResolved, bookId } = useAuth();

  // A signed-in user should never sit on the auth screens.
  if (user && bookResolved) {
    return <Redirect href={(bookId ? '/(app)/book' : '/onboarding') as any} />;
  }

  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
