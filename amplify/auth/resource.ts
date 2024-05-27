import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * When used alongside data, it is automatically configured as an auth provider for data
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailSubject: 'Welcome! Verify your email!',
    },
  },
  /**
   * enable multifactor authentication
   * @see https://docs.amplify.aws/gen2/build-a-backend/auth/manage-mfa
   */
  // multifactor: {
  //   mode: 'OPTIONAL',
  //   sms: {
  //     smsMessage: (code) => `Your verification code is ${code}`,
  //   },
  // },
  userAttributes: {
    /** request additional attributes for your app's users */
    // profilePicture: {
    //   mutable: true,
    //   required: false,
    // },
  },
});
