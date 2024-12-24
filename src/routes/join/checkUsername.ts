import { Creator } from '@db/CreatorDatabase';
import { functions } from '@db/firebase';
import { httpsCallable } from 'firebase/functions';

export default async function checkUsername(name: string) {
    if (functions === undefined) return;
    const wordplayEmail = Creator.usernameEmail(name);

    // Get missing info.
    const emailExists = httpsCallable<string>(functions, 'emailExists');
    return (await emailExists(wordplayEmail)).data === false;
}
