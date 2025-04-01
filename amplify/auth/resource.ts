import { defineAuth } from '@aws-amplify/backend';
import { tenantAdmin } from '../data/tenant-admin/resource';

/**
 * Define and configure your auth resource
 * When used alongside data, it is automatically configured as an auth provider for data
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
// export const auth = defineAuth({
//   loginWith: {
//     email: {
//       verificationEmailSubject: 'Welcome! Verify your email!',
//     },
//   },
//   /**
//    * enable multifactor authentication
//    * @see https://docs.amplify.aws/gen2/build-a-backend/auth/manage-mfa
//    */
//   // multifactor: {
//   //   mode: 'OPTIONAL',
//   //   sms: {
//   //     smsMessage: (code) => `Your verification code is ${code}`,
//   //   },
//   // },
//   userAttributes: {
//     /** request additional attributes for your app's users */
//     email: {
//       mutable: false,
//       required: true,
//     },
//     'custom:preferredTenant': {
//       mutable: true,
//       dataType: 'String',
//     },
//   },
//   groups: ['global-admin'],
//   // Grant access to the tenant admin function
//   access: (allow) => [
//     allow.resource(tenantAdmin).to([
//       'createGroup',
//       'addUserToGroup',
//       'removeUserFromGroup',
//       'listGroups',
//       'listUsersInGroup',
//     ]),
//   ],
// });
