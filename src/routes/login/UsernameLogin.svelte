<script lang="ts">
    import {
        createUserWithEmailAndPassword,
        signInWithEmailAndPassword,
    } from 'firebase/auth';
    import CreatorDatabase from '@db/CreatorDatabase';
    import validEmail from '@db/validEmail';
    import Subheader from '@components/app/Subheader.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { locales } from '@db/Database';
    import Button from '@components/widgets/Button.svelte';
    import Feedback from '@components/app/Feedback.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import LoginForm from './LoginForm.svelte';
    import { FirebaseError } from 'firebase/app';
    import { auth } from '@db/firebase';
    import getLoginErrorDescription from './getAuthErrorDescription';

    /** The username text currently in the text field */
    let username = '';
    /** Feedback to provide about the login attempt */
    let usernameLoginFeedback: string | undefined = undefined;
    /** The password currently in the password text field */
    let password = '';
    /** Whether a sign in has been attempted */
    let submitted = false;
    /** Whether the password is revealed */
    let reveal = false;
    /** True if the creator tried to log in and there's no account yet. */
    let noAccount = false;

    /** True if the username and password is valid */
    $: loginFormSubmittable =
        isValidUsername(username) && isValidPassword(password);
    $: usernameIsCheckable = !noAccount && loginFormSubmittable;

    /** The email to submit to Firebase given the current username (since Firebase doesn't support usernames) */
    $: emailUsername = CreatorDatabase.getUsernameEmail(username);

    function isValidUsername(username: string) {
        return !validEmail(username) && username.length >= 5;
    }

    function isValidPassword(pass: string) {
        return pass.length >= 10;
    }

    async function tryUsernameLogin() {
        if (auth && usernameIsCheckable) {
            try {
                await signInWithEmailAndPassword(auth, emailUsername, password);
                submitted = true;
            } catch (error) {
                if (
                    error instanceof FirebaseError &&
                    error.code === 'auth/user-not-found'
                ) {
                    noAccount = true;
                } else {
                    usernameLoginFeedback = getLoginErrorDescription(
                        $locales,
                        error
                    );
                }
            }
        }
    }

    async function createUsernameLogin() {
        if (auth && reveal) {
            try {
                await createUserWithEmailAndPassword(
                    auth,
                    emailUsername,
                    password
                );
            } catch (error) {
                usernameLoginFeedback = getLoginErrorDescription(
                    $locales,
                    error
                );
            }
        }
    }
</script>

<Subheader>{$locales.get((l) => l.ui.page.login.subheader.username)}</Subheader>
<LoginForm
    submit={noAccount ? createUsernameLogin : tryUsernameLogin}
    feedback={usernameLoginFeedback}
>
    <div>
        <TextField
            description={$locales.get(
                (l) => l.ui.page.login.field.username.description
            )}
            placeholder={$locales.get(
                (l) => l.ui.page.login.field.username.placeholder
            )}
            bind:text={username}
            editable={!submitted}
            validator={(name) => isValidUsername(name)}
        />
        {#if noAccount}
            {#if reveal}{password}{:else}<Button
                    tip={$locales.get(
                        (l) => l.ui.page.login.prompt.passwordreminder
                    )}
                    action={() => (reveal = true)}
                    >🔍{'•'.repeat(password.length)}</Button
                >{/if}
        {:else}
            <TextField
                kind={noAccount ? undefined : 'password'}
                description={$locales.get(
                    (l) => l.ui.page.login.field.password.description
                )}
                placeholder={$locales.get(
                    (l) => l.ui.page.login.field.password.placeholder
                )}
                editable={!submitted}
                bind:text={password}
                validator={(pass) => isValidPassword(pass)}
            />
        {/if}
        <Button
            submit
            background
            tip={$locales.get((l) => l.ui.page.login.button.login)}
            active={usernameIsCheckable || reveal}
            action={() => undefined}
            >{#if noAccount}&gt;&gt;{:else}&gt;{/if}</Button
        >
    </div>
    {#if noAccount}
        <Feedback
            >{$locales.get(
                (l) => l.ui.page.login.prompt.passwordreminder
            )}</Feedback
        >
    {/if}
    <MarkupHtmlView
        markup={$locales.get((l) => l.ui.page.login.prompt.usernamerules)}
    />
</LoginForm>
