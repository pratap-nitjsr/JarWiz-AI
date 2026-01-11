'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Generate a simple unique ID without external dependencies
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
}

export default function SessionRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Generate a unique session ID and redirect
    const sessionId = generateSessionId();
    router.replace(`/session/${sessionId}`);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
