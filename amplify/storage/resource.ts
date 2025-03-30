import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'surveyorappstorage',
  access: (allow: any) => ({
    'public/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write', 'delete', 'list']),
    ],
    'report-images/*': [
        allow.authenticated.to(['read', 'write', 'delete', 'list'])
    ],
    'profile/*': [
        allow.authenticated.to(['read', 'write', 'delete', 'list'])
    ]
  })
});