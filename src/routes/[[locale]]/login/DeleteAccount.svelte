<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getAnnouncer } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { Creator } from '@db/creators/CreatorDatabase';
    import { DB, locales } from '@db/Database';
    import { ensureAppCheck, ensureAuth } from '@db/firebase';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { signInWithEmailAndPassword, type User } from 'firebase/auth';
    import TextField from '@components/widgets/TextField.svelte';
    import validEmail from '@db/creators/isValidEmail';
    import isValidPassword from './IsValidPassword';

    interface Props {
        user: User;
    }

    let { user }: Props = $props();

    let deleteRequested = $state(false);

    /** Announce the confirmation prompt when it appears through the
     *  centralized Announcer (rather than a local aria-live region — see
     *  CLAUDE.md), since it renders below the button and would otherwise go
     *  unnoticed by screen reader users. */
    const announce = getAnnouncer();
    $effect(() => {
        if (deleteRequested && announce && $announce)
            $announce(
                'delete-account-confirm',
                $locales.getLanguages()[0],
                $locales.getPrimaryPlainText(
                    (l) => l.ui.page.login.prompt.reallyDelete,
                ),
            );
    });
    let confirmEmail: string = $state('');
    let password = $state('');
    let deleteSubmitted = $state(false);
    let deleteResult: 'deleted' | 'failed' | 'partial' | undefined =
        $state(undefined);
    let deleteFeedback: LocaleTextAccessor | undefined = $state(undefined);

    async function deleteAccount() {
        await ensureAppCheck();
        const auth = await ensureAuth();
        if (auth === undefined) return;

        deleteSubmitted = true;

        try {
            // Re-authenticate before deleting, but only where there is a
            // password to re-authenticate with. An account that signs in with
            // an emailed link has none — which made this whole flow unreachable
            // for exactly the accounts #628 creates. There, typing the address
            // back is the confirmation, and Firebase's own recent-login
            // requirement is what actually guards the delete: it refuses a
            // stale session, and we say so rather than failing silently.
            if (usesUsername) {
                await signInWithEmailAndPassword(
                    auth,
                    Creator.usernameEmail(confirmEmail),
                    password,
                );
            }
            deleteResult = await DB.deleteAccount();
            // On anything but a clean delete, DB.deleteAccount has already
            // raised the top banner; drop back to the form so the user can
            // retry. On success the auth state change navigates away.
            if (deleteResult !== 'deleted') deleteSubmitted = false;
        } catch (error) {
            // A link account with a session older than Firebase's window gets
            // told to sign in again, rather than "wrong password" — which it
            // has never had.
            deleteFeedback =
                !usesUsername &&
                error instanceof Error &&
                error.message.includes('requires-recent-login')
                    ? (l) => l.ui.page.login.error.expired
                    : (l) => l.ui.page.login.error.wrongPassword;
            deleteSubmitted = false;
        }
    }

    /** Whether this account signs in with a username and password, rather than
     *  an emailed link. Read off the auth email rather than providerData,
     *  because Firebase gives an email-link account the `password` provider id
     *  too — the synthesized address is the only thing that tells them apart. */
    const usesUsername = $derived(Creator.isUsername(user.email ?? ''));

    function readyToDeleteAccount(email: string, pass: string) {
        const finalEmail = usesUsername ? Creator.usernameEmail(email) : email;
        return (
            validEmail(finalEmail) &&
            finalEmail === user.email &&
            // A link account has no password to require.
            (!usesUsername || isValidPassword(pass))
        );
    }
</script>

{#if !deleteSubmitted}
    <p><LocalizedText path={(l) => l.ui.page.login.prompt.delete} /></p>
    <p
        ><Button
            background
            tip={(l) => l.ui.page.login.button.delete.tip}
            action={() => (deleteRequested = !deleteRequested)}
            active={!deleteRequested}
            label={(l) => l.ui.page.login.button.delete.label}
        />
    </p>
    {#if deleteRequested}
        <p>
            <LocalizedText path={(l) => l.ui.page.login.prompt.reallyDelete} />
        </p>

        <form
            onsubmit={() =>
                readyToDeleteAccount(confirmEmail, password)
                    ? deleteAccount()
                    : undefined}
        >
            <TextField
                id="delete-account-username"
                description={usesUsername
                    ? (l) => l.ui.page.login.field.username.description
                    : (l) => l.ui.page.login.field.email.description}
                placeholder={usesUsername
                    ? (l) => l.ui.page.login.field.username.placeholder
                    : (l) => l.ui.page.login.field.email.placeholder}
                kind={usesUsername ? undefined : 'email'}
                bind:text={confirmEmail}
                editable={!deleteSubmitted}
            />
            <!-- Only where there is one. An account that signs in with an
                 emailed link has no password, and asking for one made this
                 form impossible to complete. -->
            {#if usesUsername}
                <TextField
                    kind="password"
                    id="delete-account-password"
                    description={(l) =>
                        l.ui.page.login.field.password.description}
                    placeholder={(l) =>
                        l.ui.page.login.field.password.placeholder}
                    bind:text={password}
                    editable={!deleteSubmitted}
                    validator={(pass) =>
                        isValidPassword(pass)
                            ? true
                            : (l) => l.ui.page.login.error.invalidPassword}
                />
            {/if}
            <Button
                background
                submit
                tip={(l) => l.ui.page.login.button.reallyDelete.tip}
                active={readyToDeleteAccount(confirmEmail, password)}
                action={deleteAccount}
                label={(l) => l.ui.page.login.button.reallyDelete.label}
            />
            {#if confirmEmail?.length >= 5 && !readyToDeleteAccount(confirmEmail, password)}
                <Notice inline
                    ><MarkupHTMLView
                        inline
                        markup={(l) => l.ui.page.login.feedback.match}
                    /></Notice
                >
            {/if}
        </form>
    {/if}
{:else if deleteResult === undefined}
    <p><LocalizedText path={(l) => l.ui.page.login.feedback.deleting} /></p>
    <p><Spinning label={(l) => l.ui.page.login.feedback.deleting} /></p>
{/if}

{#if deleteFeedback}
    <Notice text={deleteFeedback} />
{/if}

<style>
    form {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        margin: var(--wordplay-spacing);
    }
</style>
