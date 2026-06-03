import { Creator } from '@db/creators/CreatorDatabase';
import { firebaseReachable } from '@db/Database';
import { functions } from '@db/firebase';
import { httpsCallable } from 'firebase/functions';
import { type EmailExistsInputs, type EmailExistsOutput } from 'shared-types';

export async function usernameAccountExists(name: string) {
    const wordplayEmail = Creator.usernameEmail(name);
    return emailAccountExists(wordplayEmail);
}

export async function emailAccountExists(email: string) {
    if (functions === undefined) return;
    const emailExists = httpsCallable<EmailExistsInputs, EmailExistsOutput>(
        functions,
        'emailExists',
    );
    try {
        const { data } = await emailExists([email]);
        firebaseReachable.set(true);
        return data !== undefined && data[email] === true;
    } catch (error) {
        // firebaseReachable.set(false);
        console.error(error);
    }
}

export async function usernamesExist(usernames: string[]) {
    if (functions === undefined) return;

    const emails = usernames.map((name) => Creator.usernameEmail(name));

    const emailExists = httpsCallable<EmailExistsInputs, EmailExistsOutput>(
        functions,
        'emailExists',
    );
    try {
        const { data } = await emailExists(emails);
        firebaseReachable.set(true);
        return data;
    } catch (error) {
        // firebaseReachable.set(false);
        console.error(error);
    }
}
