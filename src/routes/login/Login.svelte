<script lang="ts">
    import { goto } from '$app/navigation';
    import Spinning from '@components/app/Spinning.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Note from '@components/widgets/Note.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { Creator } from '@db/creators/CreatorDatabase';
    import isValidEmail from '@db/creators/isValidEmail';
    import isValidUsername from '@db/creators/isValidUsername';
    import { analytics, auth, functions } from '@db/firebase';
    import { logEvent } from 'firebase/analytics';
    import { FirebaseError } from 'firebase/app';
    import {
        isSignInWithEmailLink,
        sendSignInLinkToEmail,
        signInWithEmailAndPassword,
        signInWithEmailLink,
    } from 'firebase/auth';
    import { onMount } from 'svelte';
    import Header from '../../components/app/Header.svelte';
    import { emailAccountExists } from '../../db/creators/accountExists';
    import { locales } from '../../db/Database';
    import getAuthErrorDescription from './getAuthErrorDescription';
    import isValidPassword from './IsValidPassword';
    import LoginForm from './LoginForm.svelte';

    /** The username typed into the text field */
    let username = $state('');
    let password = $state('');
    let email = $state('');

    /** When true, login submission button shows loading spinner */
    let loading = $state(false);

    /** Feedback to show in the login form */
    let usernameFeedback: string | undefined = $state(undefined);
    let emailFeedback: string | undefined = $state(undefined);

    /** When the page is mounted, see if the link is an email sign in link, and if so, attempt to finish logging in. */
    onMount(() => {
        if (auth && isSignInWithEmailLink(auth, window.location.href))
            finishEmailLogin();
    });

    async function usernameSignin() {
        if (auth === undefined) return;
        if (!loginFormComplete()) return;

        // Create an email from the username
        const wordplayEmail = isValidEmail(username)
            ? username
            : Creator.usernameEmail(username);

        // See if the username exists by trying to log in with no password.
        loading = true;
        try {
            await signInWithEmailAndPassword(auth, wordplayEmail, password);
            goto('/profile');
        } catch (error) {
            if (error instanceof FirebaseError)
                usernameFeedback = getAuthErrorDescription($locales, error);
        } finally {
            loading = false;
        }
    }

    function loginFormComplete() {
        return (
            isValidPassword(password) &&
            (isValidUsername(username) || isValidEmail(username))
        );
    }

    async function emailSignin() {
        if (auth && functions && isValidEmail(email)) {
            loading = true;

            // Get missing info.
            const exists = await emailAccountExists(email);

            try {
                /** If the account doesn't exist, do nothing */
                if (exists) {
                    /** If this is already a link, finish the login with the email they entered. */
                    if (isSignInWithEmailLink(auth, window.location.href))
                        finishEmailLogin();
                    else {
                        // Ask Firebase to send an email.
                        await sendSignInLinkToEmail(auth, email, {
                            url: `${location.origin}/login`,
                            handleCodeInApp: true,
                        });
                        // Remember the email in local storage so we don't have to ask for it again
                        // after returning to the link above.
                        window.localStorage.setItem('email', email);
                        emailFeedback = $locales.get(
                            (l) => l.ui.page.login.prompt.sent,
                        );
                    }
                } else {
                    emailFeedback = $locales.get(
                        (l) => l.ui.page.login.prompt.sent,
                    );
                }
            } catch (err) {
                emailFeedback = getAuthErrorDescription($locales, err);
            } finally {
                loading = false;
            }
        }
    }

    function finishEmailLogin(): string | undefined {
        if (auth) {
            try {
                // If this is on the same device and browser, then the email should be in local storage.
                const storedEmail = window.localStorage.getItem('email');

                // If there's no email, prompt for one.
                if (storedEmail === null && email === '') {
                    emailFeedback = $locales.get(
                        (l) => l.ui.page.login.prompt.enter,
                    );
                }
                // Sign in.
                else {
                    signInWithEmailLink(
                        auth,
                        storedEmail ?? email,
                        window.location.href,
                    ).then(() => {
                        // Remove the email we might have stored.
                        window.localStorage.removeItem('email');

                        // Provide success feedback (which likely won't be visible, since we're navigating immediately)
                        emailFeedback = $locales.get(
                            (l) => l.ui.page.login.prompt.success,
                        );

                        // Log login event in analytics
                        if (analytics) logEvent(analytics, 'login');

                        // Remove the query on the URL, showing the profile view.
                        goto('/profile');
                    });
                }
            } catch (err) {
                emailFeedback = getAuthErrorDescription($locales, err);
            }
        }
        return undefined;
    }
</script>

<!-- Provide some reasons to log in -->
<Header>{$locales.get((l) => l.ui.page.login.header)}</Header>

<MarkupHTMLView markup={(l) => l.ui.page.login.prompt.login} />

<LoginForm submit={usernameSignin} feedback={usernameFeedback}>
    <div class="form">
        <TextField
            id="login-username-field"
            description={(l) => l.ui.page.login.field.username.description}
            placeholder={(l) => l.ui.page.login.field.username.placeholder}
            bind:text={username}
            editable={!loading}
            validator={(text) =>
                !(isValidUsername(text) || isValidEmail(text))
                    ? (l) => l.ui.page.login.error.invalidUsername
                    : true}
        />
        <TextField
            id="login-password-field"
            kind="password"
            description={(l) => l.ui.page.login.field.password.description}
            placeholder={(l) => l.ui.page.login.field.password.placeholder}
            bind:text={password}
            editable={!loading}
            validator={(pass) =>
                !isValidPassword(pass)
                    ? (l) => l.ui.page.login.error.invalidPassword
                    : true}
        />
        {#if loading}
            <Spinning></Spinning>
        {:else}
            <Button
                background
                submit
                tip={(l) => l.ui.page.login.button.login}
                active={isValidPassword(password) &&
                    (isValidUsername(username) || isValidEmail(username))}
                action={() => undefined}>&gt;</Button
            >
        {/if}
    </div>
</LoginForm>

<MarkupHTMLView markup={(l) => l.ui.page.login.prompt.join} />

<hr />

<MarkupHTMLView note markup={(l) => l.ui.page.login.prompt.forgot} />

<hr />

<LoginForm submit={emailSignin} feedback={emailFeedback}>
    <Note><MarkupHTMLView markup={(l) => l.ui.page.login.prompt.email} /></Note>
    <div class="form">
        <TextField
            id="login-email-field"
            kind={'email'}
            description={(l) => l.ui.page.login.field.email.description}
            placeholder={(l) => l.ui.page.login.field.email.placeholder}
            bind:text={email}
            editable={!loading}
            validator={(text) =>
                !isValidEmail(text) ? (l) => l.ui.page.login.error.email : true}
        />
        {#if loading}
            <Spinning></Spinning>
        {:else}
            <Button
                background
                submit
                tip={(l) => l.ui.page.login.button.login}
                active={isValidEmail(email)}
                action={() => undefined}>&gt;</Button
            >
        {/if}
    </div>
</LoginForm>

<style>
    .form {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        row-gap: var(--wordplay-spacing);
        align-items: baseline;
        justify-content: center;
        margin-bottom: 1em;
    }
</style>
