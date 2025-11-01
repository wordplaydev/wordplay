import type { Page } from '@playwright/test';

/**
 * Helper functions for authentication testing with Firebase emulator
 */

/**
 * Configuration for Firebase Auth emulator
 */
export const AUTH_EMULATOR_URL = 'http://localhost:9099';
export const FIRESTORE_EMULATOR_URL = 'http://localhost:8080';
export const FUNCTIONS_EMULATOR_URL = 'http://localhost:5001';

/**
 * Sign in a test user using the Firebase Auth emulator.
 * This uses the emulator's REST API to create and sign in a user.
 * 
 * @param page - Playwright page object
 * @param email - User email
 * @param password - User password (for emulator, can be any value)
 * @returns The user's ID token
 */
export async function signInTestUser(
    page: Page,
    email: string = 'test@example.com',
    password: string = 'testpassword123'
): Promise<string> {
    // The Firebase emulator allows signing in users via its REST API
    // First, we need to execute this in the browser context where Firebase SDK is available
    
    const result = await page.evaluate(
        async ({ email, password }) => {
            // Import Firebase auth dynamically
            const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = 
                await import('firebase/auth');
            
            const auth = getAuth();
            
            try {
                // Try to sign in first
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const idToken = await userCredential.user.getIdToken();
                return { success: true, idToken, uid: userCredential.user.uid };
            } catch (error: any) {
                // If user doesn't exist, create it
                if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    const idToken = await userCredential.user.getIdToken();
                    return { success: true, idToken, uid: userCredential.user.uid };
                }
                throw error;
            }
        },
        { email, password }
    );
    
    if (!result.success) {
        throw new Error('Failed to sign in test user');
    }
    
    return result.idToken;
}

/**
 * Sign out the current user
 * 
 * @param page - Playwright page object
 */
export async function signOutTestUser(page: Page): Promise<void> {
    await page.evaluate(async () => {
        const { getAuth, signOut } = await import('firebase/auth');
        const auth = getAuth();
        await signOut(auth);
    });
}

/**
 * Get the current authenticated user
 * 
 * @param page - Playwright page object
 * @returns The current user or null if not authenticated
 */
export async function getCurrentUser(page: Page): Promise<any> {
    return await page.evaluate(async () => {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        return auth.currentUser ? {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email,
            displayName: auth.currentUser.displayName
        } : null;
    });
}

/**
 * Clear all users from the Firebase Auth emulator.
 * Useful for test cleanup.
 */
export async function clearAuthEmulator(): Promise<void> {
    const response = await fetch(
        `${AUTH_EMULATOR_URL}/emulator/v1/projects/demo-wordplay/accounts`,
        { method: 'DELETE' }
    );
    
    if (!response.ok) {
        throw new Error(`Failed to clear auth emulator: ${response.statusText}`);
    }
}

/**
 * Clear all data from the Firestore emulator.
 * Useful for test cleanup.
 */
export async function clearFirestoreEmulator(): Promise<void> {
    const response = await fetch(
        `${FIRESTORE_EMULATOR_URL}/emulator/v1/projects/demo-wordplay/databases/(default)/documents`,
        { method: 'DELETE' }
    );
    
    if (!response.ok) {
        throw new Error(`Failed to clear Firestore emulator: ${response.statusText}`);
    }
}
