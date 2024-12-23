import type { User } from 'firebase/auth';

export default async function (
    user: User,
    claim: string,
): Promise<boolean | undefined> {
    try {
        const result = await user.getIdTokenResult();
        return claim in result.claims
            ? result.claims[claim] === true
            : undefined;
    } catch (err) {
        return undefined;
    }
}
