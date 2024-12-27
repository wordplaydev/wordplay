import { Creator } from '@db/creators/CreatorDatabase';
import { functions } from '@db/firebase';
import { httpsCallable } from 'firebase/functions';
import { type EmailExistsInputs, type EmailExistsOutput } from '@db/functions';

export async function usernameAccountExists(name: string) {
    const wordplayEmail = Creator.usernameEmail(name);
    return emailAccountExists(wordplayEmail);
}

export async function emailAccountExists(email: string) {
    if (functions === undefined) return;
    // Ask the server about the account.
    const emailExists = httpsCallable<EmailExistsInputs, EmailExistsOutput>(
        functions,
        'emailExists',
    );
    const { data } = await emailExists([email]);
    return data !== undefined && data[email] === true;
}

export async function usernamesExist(usernames: string[]) {
    if (functions === undefined) return;

    const emails = usernames.map((name) => Creator.usernameEmail(name));

    const emailExists = httpsCallable<EmailExistsInputs, EmailExistsOutput>(
        functions,
        'emailExists',
    );
    const { data } = await emailExists(emails);
    return data;
}
