/**
 * This script enables viewing and updating a user's claims.
 * so it's what we've got. Run it with `node claims.cjs`
 */
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';

// If there aren't any arguments, bail.
if (process.argv.length <= 2) {
    console.log('usage:');
    console.log(`node updatepassword.js [email] [dev|prod] [password]`);
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

// Get the field
const pass = process.argv[4];
if (pass === undefined || pass.length < 8) {
    console.log(`Need a password of at least 8 characters.`);
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
        getAuth()
            .updateUser(user.uid, {
                password: pass,
            })
            .then(() => {
                // See the UserRecord reference doc for the contents of userRecord.
                console.log('Successfully updated password.');
            })
            .catch((error) => {
                console.log('Error updating password.', error);
            });
    })
    .catch((error) => {
        console.log(error);
    });
