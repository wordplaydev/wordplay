<script lang="ts">
    import TextField from '@components/widgets/TextField.svelte';
    import Page from '@components/app/Page.svelte';
    import { preferredTranslations } from '@translation/translations';
    import { getUser } from '@components/project/Contexts';
    import Lead from '@components/app/Lead.svelte';
    import Button from '@components/widgets/Button.svelte';
    import {
        EmailAuthProvider,
        isSignInWithEmailLink,
        linkWithCredential,
        sendSignInLinkToEmail,
        signInWithEmailLink,
    } from 'firebase/auth';
    import { FirebaseError } from 'firebase/app';
    import { auth } from '@db/firebase';
    import { goto } from '$app/navigation';

    let user = getUser();
    let email: string;
    let missingEmail: boolean = false;
    let sent: boolean = false;
    let success: boolean | undefined = undefined;
    let error: string = '';

    function redirect() {
        window.localStorage.removeItem('email');
        success = true;
        goto('/projects');
    }

    function fail(err: any) {
        if (err instanceof FirebaseError) {
            console.error(err.code);
            console.error(err.message);
            error =
                {
                    'auth/id-token-expired':
                        $preferredTranslations[0].ui.login.expiredFailure,
                    'auth/id-token-revoked':
                        $preferredTranslations[0].ui.login.invalidFailure,
                    'auth/invalid-argument':
                        $preferredTranslations[0].ui.login.invalidFailure,
                    'auth/invalid-email':
                        $preferredTranslations[0].ui.login.emailFailure,
                }[err.code] ?? $preferredTranslations[0].ui.login.failure;
        } else {
            console.error(err);
            error = $preferredTranslations[0].ui.login.failure;
        }
        success = false;
    }

    function finish() {
        // If this is on the same device and browser, then the email should be in local storage.
        let storedEmail = window.localStorage.getItem('email');

        // If there's no email, prompt for one.
        if (storedEmail === null && email === '') {
            missingEmail = true;
        }
        // If no user, create an account with the email.
        else if ($user === null) {
            signInWithEmailLink(
                auth,
                storedEmail ?? email,
                window.location.href
            )
                .then(() => {
                    redirect();
                })
                .catch((err) => fail(err));
        }
        // If there is a user and it's anonymous
        else if ($user && $user.isAnonymous) {
            linkWithCredential(
                $user,
                EmailAuthProvider.credentialWithLink(
                    storedEmail ?? email,
                    window.location.href
                )
            )
                // On success, redirect to projects.
                .then(() => redirect())
                .catch((error) => fail(error));
        }
    }

    async function login() {
        if (isSignInWithEmailLink(auth, window.location.href)) finish();
        else {
            // Ask Firebase to send an email.
            await sendSignInLinkToEmail(auth, email, {
                url: `${location.origin}/login`,
                handleCodeInApp: true,
            });
            // Remember the email in local storage so we don't have to ask for it again
            // after returning to the link above.
            window.localStorage.setItem('email', email);
            sent = true;
        }
    }

    function logout() {
        auth.signOut();
    }

    // If it's a sign in, finish signing in once authenticated.
    $: if (
        $user &&
        $user.isAnonymous &&
        isSignInWithEmailLink(auth, window.location.href)
    )
        finish();
</script>

<Page>
    <div class="login">
        {#if $user && !$user.isAnonymous}
            <Lead>{$preferredTranslations[0].welcome} {$user.email}</Lead>
            <Button
                tip={$preferredTranslations[0].ui.login.logout}
                action={logout}
                >{$preferredTranslations[0].ui.login.logout}</Button
            >
        {:else}
            <Lead>{$preferredTranslations[0].ui.login.header}</Lead>
            <p>
                {#if missingEmail}
                    {$preferredTranslations[0].ui.login.enterEmail}
                {:else if $user && $user.isAnonymous}
                    {$preferredTranslations[0].ui.login.anonymousPrompt}
                {:else}
                    {$preferredTranslations[0].ui.login.prompt}
                {/if}
            </p>
            <form class="form" on:submit={login}>
                <TextField
                    placeholder={$preferredTranslations[0].ui.placeholders
                        .email}
                    bind:text={email}
                /><Button
                    tip={$preferredTranslations[0].ui.login.submit}
                    enabled={/^.+@.+$/.test(email)}
                    action={() => undefined}>&gt;</Button
                >
            </form>
            <p>
                {#if sent === true}
                    {$preferredTranslations[0].ui.login.sent}
                {:else if success === true}
                    {$preferredTranslations[0].ui.login.success}
                {:else if success === false}
                    {error}
                {/if}
            </p>
        {/if}
    </div>
</Page>

<style>
    .login {
        width: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .form {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        font-size: x-large;
        margin: var(--wordplay-spacing);
    }
</style>
