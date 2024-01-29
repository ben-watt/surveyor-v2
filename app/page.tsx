"use client"

import React from 'react'
import { withAuthenticator, ThemeProvider } from '@aws-amplify/ui-react'
import Navbar from './components/Navbar';
import Doc from './reports/building-survey-reports/Doc';




function Home() {
  return (
    <>
      <Navbar />
      <div className="container mx-auto px-5 ">
        <h1 className="text-4xl dark:text-white mb-4">Building Survey Report</h1>
        <Doc />
      </div>
    </>
  )
}

const SecureHome = withAuthenticator(Home);

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
      },
    },
  }
};

function App() {
  return (
    <ThemeProvider theme={amplifyTheme}>
      <SecureHome />
    </ThemeProvider>
  )
}

export default App;