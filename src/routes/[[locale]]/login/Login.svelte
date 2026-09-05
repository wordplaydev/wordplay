<script lang="ts">
    import Spinning from '@components/app/Spinning.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Note from '@components/widgets/Note.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { Creator } from '@db/creators/CreatorDatabase';
    import isValidEmail from '@db/creators/isValidEmail';
    import { isPlausibleUsername } from '@db/creators/username';
    import { analytics, ensureAppCheck, ensureAuth } from '@db/firebase';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { logEvent } from 'firebase/analytics';
    import { FirebaseError } from 'firebase/app';
    import {
        type Auth,
        isSignInWithEmailLink,
        signInWithEmailAndPassword,
        signInWithEmailLink,
    } from 'firebase/auth';
    import { sendSigninLink } from '@db/creators/signin';
    import { locales } from '@db/Database';
    import { onMount } from 'svelte';
    import Header from '@components/app/Header.svelte';
    import getAuthErrorDescription from './getAuthErrorDescription';
    import isValidPassword from './IsValidPassword';
    import LoginForm from './LoginForm.svelte';
    import { localeGoto } from '@util/localeGoto';

    /** The username typed into the text field */
    let username = $state('');
    let password = $state('');
    let email = $state('');

    /** True once we've sent a login link, which reveals the paste field below. */
    let linkSent = $state(false);

    /** The login link, pasted in by hand. Needed because the emailed link can
     *  land somewhere this page can't see: an installed app opens email links in
     *  a browser, whose storage is a separate container on iOS, so the sign-in
     *  would complete there instead of here. Pasting crosses that boundary, and
     *  covers reading the email on another device too. */
    let link = $state('');

    /** When true, login submission button shows loading spinner */
    let loading = $state(false);

    /** Feedback to show in the login form */
    let usernameFeedback: LocaleTextAccessor | undefined = $state(undefined);
    let emailFeedback: LocaleTextAccessor | undefined = $state(undefined);

    /** Auth loads lazily; resolve it into local reactive state so the form's
     *  guards react once the SDK is ready. Populated in onMount before any user
     *  interaction. */
    let auth = $state<Auth | undefined>(undefined);

    /** When the page is mounted, load auth, then see if the link is an email
     *  sign in link, and if so, attempt to finish logging in. */
    onMount(async () => {
        auth = await ensureAuth();
        if (auth && isSignInWithEmailLink(auth, window.location.href))
            finishEmailLogin();
    });

    async function usernameSignin() {
        if (auth === undefined) return;
        if (!loginFormComplete()) return;
        await ensureAppCheck();

        // Create an email from the username
        const wordplayEmail = isValidEmail(username)
            ? username
            : Creator.usernameEmail(username);

        // See if the username exists by trying to log in with no password.
        loading = true;
        try {
            await signInWithEmailAndPassword(auth, wordplayEmail, password);
            localeGoto('/profile');
        } catch (error) {
            if (error instanceof FirebaseError)
                usernameFeedback = getAuthErrorDescription(error);
        } finally {
            loading = false;
        }
    }

    function loginFormComplete() {
        return (
            isValidPassword(password) &&
            (isPlausibleUsername(username) || isValidEmail(username))
        );
    }

    /**
     * Ask the server to email a sign-in link.
     *
     * There is no longer an "does this account exist" check here: the callable
     * decides internally and answers identically either way, so this page
     * cannot confirm whether an address is registered even to someone reading
     * the network tab. It used to keep that property with a matched pair of
     * branches around an `emailExists` call that anyone could make directly.
     */
    async function emailSignin() {
        if (auth === undefined || !isValidEmail(email)) return;
        loading = true;
        try {
            // If we arrived here on a link, finish rather than sending another.
            if (isSignInWithEmailLink(auth, window.location.href)) {
                finishEmailLogin();
                return;
            }
            const result = await sendSigninLink(
                email,
                $locales.getLocaleString(),
            );
            if (result === 'throttled') {
                emailFeedback = (l) => l.ui.page.login.error.tooMany;
                return;
            }
            // Remember the email so we don't have to ask for it again after
            // returning to the link above.
            window.localStorage.setItem('email', email);
            emailFeedback = (l) => l.ui.page.login.prompt.sent;
            linkSent = true;
        } catch (err) {
            emailFeedback = getAuthErrorDescription(err);
        } finally {
            loading = false;
        }
    }

    /** Finish signing in with an emailed link — this page's own URL by default,
     *  or one the creator pasted in when the link opened somewhere else. */
    function finishEmailLogin(
        url: string = window.location.href,
    ): string | undefined {
        // Reached on load when the page *is* the emailed link, not only from a
        // form submit, so it attests on its own rather than relying on a
        // handler above having done it.
        void ensureAppCheck();
        if (auth) {
            try {
                // If this is on the same device and browser, then the email should be in local storage.
                const storedEmail = window.localStorage.getItem('email');

                // If there's no email, prompt for one.
                if (storedEmail === null && email === '') {
                    emailFeedback = (l) => l.ui.page.login.prompt.enter;
                }
                // Sign in.
                else {
                    signInWithEmailLink(auth, storedEmail ?? email, url)
                        .then(() => {
                            // Remove the email we might have stored.
                            window.localStorage.removeItem('email');

                            // Provide success feedback (which likely won't be visible, since we're navigating immediately)
                            emailFeedback = (l) =>
                                l.ui.page.login.prompt.success;

                            // Log login event in analytics
                            if (analytics) logEvent(analytics, 'login');

                            // Remove the query on the URL, showing the profile view.
                            localeGoto('/profile');
                        })
                        // The try/catch can't see this: the failure is a rejected
                        // promise, and an expired or already-used link is the
                        // likeliest way a pasted one fails.
                        .catch(
                            (err) =>
                                (emailFeedback = getAuthErrorDescription(err)),
                        );
                }
            } catch (err) {
                emailFeedback = getAuthErrorDescription(err);
            }
        }
        return undefined;
    }
</script>

<!-- Provide some reasons to log in -->
<Header text={(l) => l.ui.page.login.header} />

<MarkupHTMLView markup={(l) => l.ui.page.login.prompt.login} />

<LoginForm feedback={usernameFeedback} testid="username-login-form">
    <div class="form">
        <TextField
            id="login-username-field"
            description={(l) => l.ui.page.login.field.username.description}
            placeholder={(l) => l.ui.page.login.field.username.placeholder}
            bind:text={username}
            editable={!loading}
            validator={(text) =>
                !(isPlausibleUsername(text) || isValidEmail(text))
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
                    (isPlausibleUsername(username) || isValidEmail(username))}
                action={usernameSignin}
                testid="login-button">&gt;</Button
            >
        {/if}
    </div>
</LoginForm>

<MarkupHTMLView markup={(l) => l.ui.page.login.prompt.join} />

<hr />

<MarkupHTMLView note markup={(l) => l.ui.page.login.prompt.forgot} />

<hr />

<LoginForm feedback={emailFeedback} testid="email-login-form">
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
                action={emailSignin}>&gt;</Button
            >
        {/if}
    </div>
</LoginForm>

<!-- Offer to finish with a pasted link once one has been sent. The emailed link
     can open somewhere this page can't see — an installed app hands email links
     to a browser, and on iOS that's a separate storage container — so pasting is
     the only way to finish signing in here. It covers reading the email on
     another device too. -->
{#if linkSent}
    <LoginForm feedback={undefined} testid="paste-link-form">
        <Note
            ><MarkupHTMLView
                markup={(l) => l.ui.page.login.prompt.paste}
            /></Note
        >
        <div class="form">
            <TextField
                id="login-link-field"
                description={(l) => l.ui.page.login.field.link.description}
                placeholder={(l) => l.ui.page.login.field.link.placeholder}
                bind:text={link}
                editable={!loading}
                validator={(text) =>
                    auth === undefined || isSignInWithEmailLink(auth, text)
                        ? true
                        : (l) => l.ui.page.login.error.invalid}
            />
            <Button
                background
                submit
                tip={(l) => l.ui.page.login.button.login}
                active={auth !== undefined && isSignInWithEmailLink(auth, link)}
                action={() => {
                    finishEmailLogin(link);
                }}>&gt;</Button
            >
        </div>
    </LoginForm>
{/if}

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
