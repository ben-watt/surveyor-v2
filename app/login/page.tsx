"use client"

import { withAuthenticator, ThemeProvider } from '@aws-amplify/ui-react'
import { redirect } from 'next/navigation';

const amplifyTheme = {
    name: 'custom-theme',
    tokens: {
      colors: {
        primary: {
          10: 'grey',
          20: 'grey',
          30: 'grey',
          40: 'black',
          50: 'black',
          60: 'black',
          70: 'black',
          80: 'black',
          90: 'black',
          100: 'black'
        },
      },
    }
  };

  export default function SignIn() {
    const Authenticator = withAuthenticator((p) => p.user ? "/surveys" : "");

    return (
        <ThemeProvider theme={amplifyTheme}>
          <Authenticator />
        </ThemeProvider>
      )
  }