'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokens, setUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        router.push('/auth/login?error=' + error);
        return;
      }

      if (!code) {
        console.error('No authorization code received');
        router.push('/auth/login?error=no_code');
        return;
      }

      try {
        console.log('=== OAuth Callback Started ===');
        console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
        console.log('Code:', code?.substring(0, 20) + '...');
        
        // Exchange code for tokens
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/auth/google/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        const responseText = await response.text();
        console.log('Response body:', responseText);

        if (!response.ok) {
          let errorData;
          try {
            errorData = JSON.parse(responseText);
          } catch {
            errorData = { detail: responseText || 'Authentication failed' };
          }
          console.error('Auth failed:', errorData);
          throw new Error(errorData.detail || 'Authentication failed');
        }

        const data = JSON.parse(responseText);
        console.log('Auth successful:', { 
          hasAccessToken: !!data.access_token,
          hasRefreshToken: !!data.refresh_token,
          user: data.user?.email 
        });
        
        // Store tokens
        setTokens(data.access_token, data.refresh_token);
        
        // Store user data
        setUser(data.user);

        // Small delay to ensure state is saved
        await new Promise(resolve => setTimeout(resolve, 200));

        console.log('=== Redirecting to home ===');
        // Redirect to home
        router.push('/');
      } catch (error) {
        console.error('=== Callback error ===', error);
        alert('Login failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
        router.push('/auth/login?error=auth_failed');
      }
    };

    handleCallback();
  }, [searchParams, router, setTokens, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
        <h2 className="mt-6 text-2xl font-semibold text-gray-900">
          Completing sign in...
        </h2>
        <p className="mt-2 text-gray-600">
          Please wait while we set up your account
        </p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <h2 className="mt-6 text-2xl font-semibold text-gray-900">Loading...</h2>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
