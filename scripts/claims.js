/**
 * This script enables viewing and updating a user's claims.
 * so it's what we've got. Run it with `node claims.cjs`
 */
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';

const flags = ['admin', 'mod', 'banned', 'teacher'];

// If there aren't any arguments, bail.
if (process.argv.length <= 2) {
    console.log('usage:');
    console.log(`node claims.js [email] [dev|prod] [+|-] [${flags.join('|')}]`);
    process.exit();
}

// Get the requested email and bail if none was provided.
const email = process.argv[2];
if (email === undefined) {
    console.log('No email provided.');
    process.exit();
}

// Get the project, either "dev" or "prod"
const project = process.argv[3];
if (project !== 'dev' && project !== 'prod') {
    console.log(
        `Expected 'dev' or 'prod' after email, but received ${project}`,
    );
    process.exit();
}

// Get the operation and bail if there wasn't one.
const operation = process.argv[4];
if (operation !== undefined && operation !== '+' && operation !== '-') {
    console.log('Expected an + or - operation');
    process.exit();
}

// Get the field
const privilege = process.argv[5];
if (privilege !== undefined && !flags.includes(privilege)) {
    console.log(`Expected one of ${flags.join(',')} after the operation`);
    process.exit();
}

console.log('Reading service key...');

const serviceKeyPath = `../firebase-${project}-service-key.json`;

// Log in with the secret service key generated in the Firebase service accounts console.
const serviceAccount = JSON.parse(
    readFileSync(`../wordplay-${project}-service-key.json`, 'utf8'),
);

if (serviceAccount === undefined) {
    console.log(`Couldn't find service key at ${serviceKeyPath}`);
    process.exit();
}

console.log('Connecting to Firebase with key...');

// Initialize the SDK with the service account.
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

// Add the publisher claim to the email address.
getAuth()
    .getUserByEmail(email)
    .then((user) => {
        // Add incremental custom claim without overwriting existing claims.
        let currentCustomClaims = user.customClaims;

        // Reading? Just print.
        if (operation === undefined || privilege === undefined) {
            console.log(`${email}'s privileges are...`);
            console.log(currentCustomClaims);
        }
        // Otherwise, update.
        else {
            if (currentCustomClaims === undefined) currentCustomClaims = {};
            currentCustomClaims[privilege] = operation === '+';
            // Add custom claims for additional privileges.
            getAuth()
                .setCustomUserClaims(user.uid, currentCustomClaims)
                .then(() => {
                    console.log(
                        `Successfully ${
                            operation === '+' ? 'added' : 'removed'
                        } '${privilege}' privilege`,
                    );
                });
        }
    })
    .catch((error) => {
        console.log(error);
    });
