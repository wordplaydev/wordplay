# Firebase Emulator Setup for Playwright Tests

This repository is configured to use Firebase Emulators for authentication testing with Playwright, both locally and in GitHub Actions.

## Prerequisites

### Local Development
- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- Java Runtime Environment (JRE) for Firebase emulators

### GitHub Actions
All prerequisites are automatically installed by the CI workflow.

## How It Works

### Configuration

1. **Firebase Configuration** (`firebase.json`):
   - Auth emulator runs on port 9099
   - Firestore emulator runs on port 8080
   - Functions emulator runs on port 5001

2. **Playwright Configuration** (`playwright.config.ts`):
   - Uses global setup to start Firebase emulators before tests
   - Builds functions and starts preview server
   - Automatically tears down emulators after tests

3. **Environment Variables** (`.env`):
   - `PUBLIC_CONTEXT=local` tells the app to use emulators
   - `PUBLIC_FIREBASE_PROJECT_ID=demo-wordplay` is the demo project for emulators

### Running Tests Locally

```bash
# Install dependencies
npm ci

# Install functions dependencies
cd functions && npm ci && cd ..

# Run Playwright tests (emulators start automatically)
npm run end2end
```

The global setup will automatically:
1. Check if emulators are already running
2. Start emulators if needed
3. Wait for them to be ready
4. Run tests
5. Clean up emulators when done

### Manual Emulator Control

If you want to run the emulators manually (e.g., for debugging):

```bash
# Start emulators manually
npm run emu

# In another terminal, skip emulator startup in tests
SKIP_FIREBASE_EMULATOR=true npm run end2end
```

### GitHub Actions

The workflow in `.github/workflows/playwright.yml`:
1. Installs Firebase CLI
2. Installs dependencies for both root and functions
3. Runs Playwright tests (which automatically start emulators)

## Writing Authentication Tests

Use the helper functions in `tests/end2end/firebase-helpers.ts`:

```typescript
import { expect, test } from '@playwright/test';
import { signInTestUser, signOutTestUser, getCurrentUser } from './firebase-helpers';

test('my auth test', async ({ page }) => {
    await page.goto('/');
    
    // Sign in a test user
    await signInTestUser(page, 'test@example.com', 'password123');
    
    // Verify user is signed in
    const user = await getCurrentUser(page);
    expect(user).not.toBeNull();
    expect(user.email).toBe('test@example.com');
    
    // Sign out
    await signOutTestUser(page);
});
```

### Available Helper Functions

- `signInTestUser(page, email, password)` - Sign in or create a user
- `signOutTestUser(page)` - Sign out current user
- `getCurrentUser(page)` - Get current authenticated user
- `clearAuthEmulator()` - Clear all users (for cleanup between tests)
- `clearFirestoreEmulator()` - Clear all Firestore data

## Emulator Persistence

Firebase emulators run in-memory by default. Each test run starts with a clean state. If you need to import/export data, see the [Firebase Emulator documentation](https://firebase.google.com/docs/emulator-suite/install_and_configure).

## Troubleshooting

### Emulators fail to start
- Ensure Java is installed: `java -version`
- Check if ports are already in use: `lsof -i :9099`
- Try starting emulators manually: `npm run emu`

### Tests timeout waiting for emulators
- Increase timeout in `global-setup.ts` if needed
- Check emulator logs for errors

### Authentication doesn't work
- Verify `PUBLIC_CONTEXT=local` in `.env`
- Check browser console for Firebase connection errors
- Ensure emulators are running on correct ports

## CI/CD Considerations

- Tests run with emulators in CI automatically
- No Firebase credentials needed for emulator tests
- Emulators provide a consistent, isolated test environment
- Data is ephemeral and cleaned up after each workflow run
