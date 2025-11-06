import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { fetchAuthSession } from 'aws-amplify/auth';

/**
 * Decode JWT token payload
 */
function decodeJWT(token: string): any {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Failed to decode JWT:', error);
        return null;
    }
}

export const adminGuard: CanActivateFn = async () => {
    const router = inject(Router);

    try {
        console.log('[AdminGuard] Checking admin access...');
        const session = await fetchAuthSession();
        console.log('[AdminGuard] Session:', session);
        console.log('[AdminGuard] Session tokens:', session.tokens);

        const idToken = session.tokens?.idToken;
        console.log('[AdminGuard] ID Token:', idToken);
        console.log('[AdminGuard] ID Token type:', typeof idToken);

        if (!idToken) {
            console.log('[AdminGuard] No ID token found, redirecting to home');
            return router.parseUrl('/home');
        }

        // Decode the ID token to get the payload
        const tokenString = typeof idToken === 'string' ? idToken : idToken.toString();
        console.log('[AdminGuard] Token string length:', tokenString.length);

        const payload = decodeJWT(tokenString);
        console.log('[AdminGuard] Decoded payload:', payload);
        console.log('[AdminGuard] Payload keys:', payload ? Object.keys(payload) : 'null');

        // Check for cognito:groups in the payload
        const groups = payload?.['cognito:groups'] || [];
        console.log('[AdminGuard] Cognito groups:', groups);
        console.log('[AdminGuard] Groups type:', typeof groups, 'Is array:', Array.isArray(groups));
        console.log('[AdminGuard] Checking if groups includes "admins":', groups.includes('admins'));

        // Also check other possible group field names
        if (payload) {
            console.log('[AdminGuard] All payload fields with "group" or "admin":',
                Object.keys(payload).filter(key =>
                    key.toLowerCase().includes('group') ||
                    key.toLowerCase().includes('admin')
                )
            );
        }

        if (Array.isArray(groups) && groups.includes('admins')) {
            console.log('[AdminGuard] User is admin, allowing access');
            return true;
        }

        console.log('[AdminGuard] User is not admin, redirecting to home');
        // Redirect to home if not admin
        return router.parseUrl('/home');
    } catch (error) {
        console.error('[AdminGuard] Failed to check admin access:', error);
        return router.parseUrl('/home');
    }
};

