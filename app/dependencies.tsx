'use client';

import './globals.css';
import ConfigureAmplifyClientSide from '@/app/home/components/ConfigureAmplify';
import { ConfigureAwsRum } from '@/app/home/components/ConfigureAwsRum';

export const ClientSideDependencies = () => {
  return (
    <>
      <ConfigureAmplifyClientSide />
      <ConfigureAwsRum />
    </>
  );
};
