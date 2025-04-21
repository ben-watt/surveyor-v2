"use client";

import { ThemeProvider, withAuthenticator } from "@aws-amplify/ui-react";
import { AuthUser } from "aws-amplify/auth";
import { redirect } from "next/navigation";
import { useEffect } from "react";


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

function Login({ user }: { user?: AuthUser }) {
  useEffect(() => {
    if (user) {
      redirect("/");
    }
  }, [user]);
  return null;
}

let CustomLogin = withAuthenticator(Login);

export default function WrappedCustomLogin() {
    return (
        <ThemeProvider theme={amplifyTheme}>
            <CustomLogin />
        </ThemeProvider>
    );
}
