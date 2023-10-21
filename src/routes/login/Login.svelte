<script lang="ts">
    import {
        isSignInWithEmailLink,
        sendSignInLinkToEmail,
    } from 'firebase/auth';
    import Header from '../../components/app/Header.svelte';
    import TextField from '../../components/widgets/TextField.svelte';
    import { locales } from '../../db/Database';
    import { getUser } from '../../components/project/Contexts';
    import { analytics, auth } from '../../db/firebase';
    import Button from '../../components/widgets/Button.svelte';
    import validateEmail from '../../db/validEmail';
    import Feedback from '../../components/app/Feedback.svelte';
    import { onMount } from 'svelte';
    import { signInWithEmailLink } from 'firebase/auth';
    import { logEvent } from 'firebase/analytics';
    import { FirebaseError } from 'firebase/app';
    import { getLoginErrorDescription } from './login';

    let user = getUser();
    let success: boolean | undefined = undefined;

    let missingEmail = false;
    let email: string;
    let sent = false;
    let loginFeedback = '';

    async function startLogin() {
        if (auth) {
            try {
                if (isSignInWithEmailLink(auth, window.location.href))
                    finishLogin();
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
            } catch (err) {
                communicateLoginFailure(err);
            }
        }
    }

    function finishLogin(): string | undefined {
        if (auth) {
            try {
                // If this is on the same device and browser, then the email should be in local storage.
                const storedEmail = window.localStorage.getItem('email');

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
                            window.localStorage.removeItem('email');
                            success = true;

                            // Log login
                            if (analytics) logEvent(analytics, 'login');
                        })
                        .catch((err) => communicateLoginFailure(err));
                }
            } catch (err) {
                communicateLoginFailure(err);
            }
        }
        return undefined;
    }

    function communicateLoginFailure(err: unknown): string | undefined {
        if (err instanceof FirebaseError) {
            console.error(err.code);
            console.error(err.message);
            loginFeedback =
                getLoginErrorDescription(err.code, $locales) ??
                $locales.get((l) => l.ui.page.login.error.failure);
        } else {
            console.error(err);
            return $locales.get((l) => l.ui.page.login.error.failure);
        }
        success = false;
    }

    // If it's a sign in, finish signing in once authenticated.
    onMount(() => {
        if (auth && isSignInWithEmailLink(auth, window.location.href))
            finishLogin();
    });
</script>

<Header>{$locales.get((l) => l.ui.page.login.header)}</Header>
<p>
    {#if missingEmail}
        {$locales.get((l) => l.ui.page.login.prompt.enter)}
    {:else if $user === null}
        {$locales.get((l) => l.ui.page.login.prompt.login)}
    {/if}
</p>
<form on:submit={startLogin}>
    <TextField
        description={$locales.get(
            (l) => l.ui.page.login.field.email.description
        )}
        placeholder={$locales.get(
            (l) => l.ui.page.login.field.email.placeholder
        )}
        bind:text={email}
    /><Button
        submit
        tip={$locales.get((l) => l.ui.page.login.button.login)}
        active={validateEmail(email)}
        action={() => undefined}>&gt;</Button
    >
</form>
<p>
    {#if sent === true}
        <Feedback>{$locales.get((l) => l.ui.page.login.prompt.sent)}</Feedback>
    {:else if success === true}
        <Feedback
            >{$locales.get((l) => l.ui.page.login.prompt.success)}</Feedback
        >
    {:else if success === false}
        <Feedback>{loginFeedback}</Feedback>
    {/if}
</p>
