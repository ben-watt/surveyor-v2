import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function ReturnToConfigButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const returnTo = searchParams.get('returnTo');
  
  if (!returnTo) {
    return null;
  }
  
  const handleReturn = () => {
    try {
      const returnUrl = decodeURIComponent(returnTo);
      router.push(returnUrl);
    } catch (error) {
      console.error('Failed to parse return URL:', error);
      router.push('/home/configuration');
    }
  };
  
  return (
    <Button 
      variant="outline" 
      onClick={handleReturn}
      className="mb-4"
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      Back to Configuration
    </Button>
  );
}