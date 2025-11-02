import { defineStorage } from '@aws-amplify/backend';

export const poliAssets = defineStorage({
  name: 'poli-assets',
  access: (allow) => ({
    'public/*': [
      allow.guest.to(['read']),
    ],
  }),
 
});