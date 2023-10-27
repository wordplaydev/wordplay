<script lang="ts">
    import {
        isSignInWithEmailLink,
        sendSignInLinkToEmail,
        signInWithEmailLink,
    } from 'firebase/auth';
    import Subheader from '@components/app/Subheader.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { locales } from '@db/Database';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import validEmail from '@db/validEmail';
    import LoginForm from './LoginForm.svelte';
    import { analytics, auth } from '@db/firebase';
    import { onMount } from 'svelte';
    import getLoginErrorDescription from './getAuthErrorDescription';
    import { getUser } from '@components/project/Contexts';
    import { logEvent } from 'firebase/analytics';
    import { goto } from '$app/navigation';

    /** The current email text in the text field */
    let email: string;
    /** Whether the form was submitted */
    let submitted = false;
    /** Feedback about the submission */
    let feedback: string | undefined = undefined;
    /** Get the current login context */
    let user = getUser();

    /** Whether the form is ready to be submitted */
    $: submittable = !submitted && validEmail(email);

    /** When the page is mounted, see if the link is an email sign in link, and if so, attempt to finish logging in. */
    onMount(() => {
        if (auth && isSignInWithEmailLink(auth, window.location.href))
            finishEmailLogin();
    });

    async function sendLoginEmail() {
        if (auth && submittable) {
            try {
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
                    submitted = true;
                    feedback = $locales.get((l) => l.ui.page.login.prompt.sent);
                }
            } catch (err) {
                feedback = getLoginErrorDescription($locales, err);
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
                    feedback = $locales.get(
                        (l) => l.ui.page.login.prompt.enter
                    );
                }
                // If no user, create an account with the email.
                else if ($user === null) {
                    signInWithEmailLink(
                        auth,
                        storedEmail ?? email,
                        window.location.href
                    ).then(() => {
                        // Remove the email we might have stored.
                        window.localStorage.removeItem('email');

                        // Provide success feedback (which likely won't be visible, since we're navigating immediately)
                        feedback = $locales.get(
                            (l) => l.ui.page.login.prompt.success
                        );

                        // Log login event in analytics
                        if (analytics) logEvent(analytics, 'login');

                        // Remove the query on the URL, showing the profile view.
                        goto('/login');
                    });
                }
            } catch (err) {
                feedback = getLoginErrorDescription($locales, err);
            }
        }
        return undefined;
    }
</script>

<Subheader>{$locales.get((l) => l.ui.page.login.subheader.email)}</Subheader>
<LoginForm submit={sendLoginEmail} {feedback}>
    <div>
        <TextField
            kind="email"
            description={$locales.get(
                (l) => l.ui.page.login.field.email.description
            )}
            placeholder={$locales.get(
                (l) => l.ui.page.login.field.email.placeholder
            )}
            bind:text={email}
            editable={!submitted}
        />
        <Button
            submit
            background
            tip={$locales.get((l) => l.ui.page.login.button.login)}
            active={submittable}
            action={() => undefined}>&gt;</Button
        >
    </div>
    <MarkupHtmlView
        markup={$locales.get((l) => l.ui.page.login.prompt.emailrules)}
    />
</LoginForm>
