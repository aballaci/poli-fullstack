import { defineAuth, secret } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
       externalProviders: {
      // This is the key part for Google Sign-in
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
        scopes: ['email', 'profile', 'openid'],
      },
      // You must also configure your callback URLs in the Google Console
      callbackUrls: [
        'http://localhost:4200/', // For local dev
        'https://poli.ballaci.com/' // For production
      ],
      logoutUrls: [
        'http://localhost:4200/',
        'https://poli.ballaci.com/'
      ]
    },
  },
});
