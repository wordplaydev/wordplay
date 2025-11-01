import { type FullConfig } from '@playwright/test';
import { spawn, type ChildProcess } from 'child_process';

let emulatorProcess: ChildProcess | undefined;

/**
 * Global setup for Playwright tests.
 * This starts the Firebase emulators before running tests.
 */
async function globalSetup(config: FullConfig) {
    // Only start emulators if not already running (e.g., started manually)
    const isEmulatorRunning = await checkEmulatorRunning();
    
    if (!isEmulatorRunning && !process.env.SKIP_FIREBASE_EMULATOR) {
        console.log('Starting Firebase emulators...');
        await startFirebaseEmulators();
        console.log('Firebase emulators started successfully!');
    } else if (isEmulatorRunning) {
        console.log('Firebase emulators already running, skipping startup...');
    } else {
        console.log('Skipping Firebase emulator startup (SKIP_FIREBASE_EMULATOR is set)');
    }

    return async () => {
        // Global teardown - stop emulators if we started them
        if (emulatorProcess) {
            console.log('Stopping Firebase emulators...');
            try {
                // Try to kill the process group first (Unix-like systems)
                if (emulatorProcess.pid && process.platform !== 'win32') {
                    process.kill(-emulatorProcess.pid, 'SIGTERM');
                } else {
                    // Fallback to killing just the main process
                    emulatorProcess.kill('SIGTERM');
                }
            } catch (e) {
                // If that fails, try a regular kill
                try {
                    emulatorProcess.kill('SIGKILL');
                } catch (finalError) {
                    console.error('Failed to stop Firebase emulators:', finalError);
                }
            }
        }
    };
}

/**
 * Check if Firebase emulators are already running
 */
async function checkEmulatorRunning(): Promise<boolean> {
    try {
        const response = await fetch('http://localhost:9099');
        return response.ok || response.status === 404;
    } catch {
        return false;
    }
}

/**
 * Start Firebase emulators and wait for them to be ready
 */
async function startFirebaseEmulators(): Promise<void> {
    return new Promise((resolve, reject) => {
        // Start Firebase emulators
        emulatorProcess = spawn(
            'firebase',
            [
                'emulators:start',
                '--project=demo-wordplay',
                '--only',
                'auth,firestore,functions',
            ],
            {
                stdio: 'pipe',
                detached: true,
                shell: true,
            }
        );

        let output = '';
        let errorOutput = '';

        if (emulatorProcess.stdout) {
            emulatorProcess.stdout.on('data', (data) => {
                const line = data.toString();
                output += line;
                
                // Check multiple possible indicators that emulators are ready
                // This handles different Firebase CLI versions
                const readyIndicators = [
                    'All emulators ready',
                    'All emulators started',
                    '✔  All emulators ready',
                ];
                
                const isReady = readyIndicators.some(indicator => 
                    line.includes(indicator)
                );
                
                if (isReady) {
                    console.log('Firebase emulators are ready!');
                    resolve();
                }
            });
        }

        if (emulatorProcess.stderr) {
            emulatorProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
        }

        emulatorProcess.on('error', (error) => {
            reject(new Error(`Failed to start Firebase emulators: ${error.message}`));
        });

        emulatorProcess.on('exit', (code) => {
            if (code !== 0 && code !== null) {
                reject(new Error(`Firebase emulators exited with code ${code}\nOutput: ${output}\nError: ${errorOutput}`));
            }
        });

        // Timeout after 60 seconds
        setTimeout(() => {
            reject(new Error('Timeout waiting for Firebase emulators to start'));
        }, 60000);
    });
}

export default globalSetup;
