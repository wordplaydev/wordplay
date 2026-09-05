import { getAuth } from 'firebase-admin/auth';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type {
    JoinAccountError,
    JoinAccountInputs,
    JoinAccountOutput,
} from 'shared-types';
import { emailEligibleOn } from './ageOfConsent.js';
import { isValidUsername } from './username.js';
import {
    assignUsername,
    releaseReservation,
    reserveUsername,
} from './handles.js';
import { sendSigninEmail } from './signinEmail.js';
import { allowSigninLink } from './signinThrottle.js';
import { UsernameEmailDomain, usernameEmail } from './username.js';
import { signinLinkSettings } from './signinEmail.js';

/**
 * Create an account (#628).
 *
 * Account creation runs here rather than through the client's
 * `createUserWithEmailAndPassword` for two reasons. It is the only way every
 * account can be guaranteed a username — the invariant the rest of #628 rests
 * on — and it is the only way account creation can be App Check enforced on day
 * one, since enforcement on Firebase Authentication itself is still Preview and
 * ships in monitor mode first. Minting accounts is what makes the per-creator
 * translation budget worth defeating (#1299).
 *
 * NOTHING IN `request.data` MAY BE LOGGED. A password, a birthday, and a region
 * all cross this function, and two of them are deliberately never stored — an
 * error path that echoed the request would put them in Cloud Logging forever.
 */

const MinimumPasswordLength = 6;

function fail(error: JoinAccountError): JoinAccountOutput {
    return { error };
}

export default async function joinAccount(
    request: CallableRequest<JoinAccountInputs>,
): Promise<JoinAccountOutput> {
    const { username, region, birthdate, password, email, locale } =
        request.data;
    const auth = getAuth();

    if (typeof username !== 'string' || !isValidUsername(username))
        return fail('username-invalid');

    const eligible = emailEligibleOn(birthdate, region);
    if (eligible === undefined) return fail('birthdate-invalid');

    // ——— A username and a password ———
    if (typeof password === 'string') {
        if (password.length < MinimumPasswordLength)
            return fail('password-invalid');

        // Hold the name first: it is the contended resource, and createUser
        // cannot run inside a Firestore transaction, so the reservation has to
        // be what decides a race between two people submitting the same name.
        const held = await reserveUsername(username).catch(
            () => 'failed' as const,
        );
        if (held !== 'reserved')
            return fail(held === 'taken' ? 'username-taken' : 'failed');

        try {
            const user = await auth.createUser({
                email: usernameEmail(username),
                password,
            });
            await assignUsername(user.uid, username, {
                emailEligibleOn: eligible,
            });
            return { token: await auth.createCustomToken(user.uid) };
        } catch (error) {
            // Never include the request in the message: it carries a password.
            console.error('Could not create a password account', error);
            await releaseReservation(username);
            return fail('failed');
        }
    }

    // ——— A username and an email address ———
    if (typeof email === 'string') {
        if (
            !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
            email.endsWith(UsernameEmailDomain)
        )
            return fail('email-invalid');
        // Defence in depth: the form already knows this from the mirrored table,
        // but a form is only a suggestion to anyone willing to skip it.
        if (eligible > Date.now()) return fail('not-eligible');

        const pepper = process.env.THROTTLE_PEPPER ?? '';
        if (!(await allowSigninLink(email, request.rawRequest.ip, pepper)))
            return fail('throttled');

        const existing = await auth
            .getUserByEmail(email)
            .catch(() => undefined);

        // An address that already has an account gets a plain sign-in link and
        // nothing is created. That is what keeps this endpoint from confirming
        // whether an address is registered — the answer below is identical
        // either way.
        let uid = existing?.uid;
        if (uid === undefined) {
            const held = await reserveUsername(username).catch(
                () => 'failed' as const,
            );
            if (held !== 'reserved')
                return fail(held === 'taken' ? 'username-taken' : 'failed');
            try {
                const user = await auth.createUser({ email });
                uid = user.uid;
                await assignUsername(uid, username, {
                    emailEligibleOn: eligible,
                });
            } catch (error) {
                console.error('Could not create an email account', error);
                await releaseReservation(username);
                return fail('failed');
            }
        }

        try {
            const link = await auth.generateSignInWithEmailLink(
                email,
                signinLinkSettings(),
            );
            await sendSigninEmail(
                email,
                link,
                locale,
                process.env.RESEND_API_KEY ?? '',
            );
        } catch (error) {
            console.error('Could not send a join link', error);
        }
        return { sent: true };
    }

    return fail('failed');
}
