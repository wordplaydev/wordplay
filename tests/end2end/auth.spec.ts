import { expect, test } from '@playwright/test';
import goHome from './goHome';
import {
    signInTestUser,
    signOutTestUser,
    getCurrentUser,
} from './firebase-helpers';

/**
 * Example authentication tests using Firebase emulator.
 * These tests demonstrate how to test authentication flows locally and in CI.
 */

test.describe('Authentication with Firebase Emulator', () => {
    test('can sign in a test user', async ({ page }) => {
        // Navigate to the app
        await goHome(page);

        // Sign in a test user using the Firebase emulator
        await signInTestUser(page, 'test@example.com', 'password123');

        // Verify user is signed in
        const user = await getCurrentUser(page);
        expect(user).not.toBeNull();
        expect(user.email).toBe('test@example.com');
    });

    test('can sign out a test user', async ({ page }) => {
        // Navigate to the app
        await goHome(page);

        // Sign in first
        await signInTestUser(page, 'test2@example.com', 'password123');
        
        // Verify signed in
        let user = await getCurrentUser(page);
        expect(user).not.toBeNull();

        // Sign out
        await signOutTestUser(page);

        // Verify signed out
        user = await getCurrentUser(page);
        expect(user).toBeNull();
    });

    test('different users have different UIDs', async ({ page }) => {
        // Navigate to the app
        await goHome(page);

        // Sign in first user
        await signInTestUser(page, 'user1@example.com', 'password123');
        const user1 = await getCurrentUser(page);
        const uid1 = user1.uid;

        // Sign out
        await signOutTestUser(page);

        // Sign in second user
        await signInTestUser(page, 'user2@example.com', 'password123');
        const user2 = await getCurrentUser(page);
        const uid2 = user2.uid;

        // Verify different UIDs
        expect(uid1).not.toBe(uid2);
        expect(user2.email).toBe('user2@example.com');
    });
});
