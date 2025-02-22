<script lang="ts">
    import { goto } from '$app/navigation';
    import Feedback from '@components/app/Feedback.svelte';
    import Header from '@components/app/Header.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import { Creator } from '@db/creators/CreatorDatabase';
    import isValidUsername from '@db/creators/isValidUsername';
    import { locales } from '@db/Database';
    import { auth, functions } from '@db/firebase';
    import { createUserWithEmailAndPassword } from 'firebase/auth';
    import { usernameAccountExists } from '../../db/creators/accountExists';
    import getAuthErrorDescription from '../login/getAuthErrorDescription';
    import isValidPassword from '../login/IsValidPassword';
    import LoginForm from '../login/LoginForm.svelte';

    let username = $state('');
    let password = $state('');
    let password2 = $state('');
    let available: undefined | boolean = $state(undefined);
    let reveal = $state(false);

    /** When true, login submission button shows loading spinner */
    let loading = $state(false);

    /** When true, checking if username exists */
    let checkingUsername = $state(false);

    /** Feedback to show in the login form */
    let feedback: string | undefined = $state(undefined);

    function createAccountFormComplete() {
        return (
            isValidUsername(username) &&
            isValidPassword(password) &&
            password === password2
        );
    }

    async function createAccount() {
        if (auth && functions && createAccountFormComplete()) {
            try {
                loading = true;

                // Create a fake Wordplay email from the username, since Firefox doesn't support username accounts.
                // We store the email has in the database.
                const wordplayEmail = Creator.usernameEmail(username);

                // Create the account in Firebase Auth.
                await createUserWithEmailAndPassword(
                    auth,
                    wordplayEmail,
                    password,
                );

                // If successful, navigate to the login page to show the profile.
                goto('/profile');
            } catch (error) {
                feedback = getAuthErrorDescription($locales, error);
            } finally {
                loading = false;
            }
        }
    }
</script>

<Header>{$locales.get((l) => l.ui.page.join.header)}</Header>

<LoginForm submit={createAccount} {feedback}>
    <MarkupHTMLView markup={(l) => l.ui.page.join.prompt.create} />

    <MarkupHTMLView note markup={(l) => l.ui.page.join.prompt.username} />

    <p class="center">
        <TextField
            id="username-field"
            description={(l) => l.ui.page.login.field.username.description}
            placeholder={(l) => l.ui.page.login.field.username.placeholder}
            bind:text={username}
            editable={!loading}
            validator={(text) =>
                !isValidUsername(text)
                    ? (l) => l.ui.page.login.error.invalidUsername
                    : true}
            changed={() => {
                if (available === false) available = undefined;
            }}
            dwelled={async (text) => {
                checkingUsername = true;
                available = (await usernameAccountExists(text)) === false;
                checkingUsername = false;
            }}
        />
    </p>
    {#if checkingUsername}<Spinning></Spinning>
    {:else if available === false}
        <Feedback>This username is taken.</Feedback>
    {/if}

    <MarkupHTMLView note markup={(l) => l.ui.page.join.prompt.password} />
    <p class="center">
        <TextField
            id="password-field"
            kind={reveal ? undefined : 'password'}
            description={(l) => l.ui.page.login.field.password.description}
            placeholder={(l) => l.ui.page.login.field.password.placeholder}
            bind:text={password}
            editable={!loading}
            validator={(pass) =>
                !isValidPassword(pass)
                    ? (l) => l.ui.page.login.error.invalidPassword
                    : true}
        />
        <TextField
            id="password-repeat-field"
            kind={reveal ? undefined : 'password'}
            description={(l) => l.ui.page.login.field.password.description}
            placeholder={(l) => l.ui.page.login.field.password.placeholder}
            bind:text={password2}
            editable={!loading}
            validator={(pass) =>
                !isValidPassword(pass)
                    ? (l) => l.ui.page.login.error.invalidPassword
                    : pass !== password
                      ? (l) => l.ui.page.login.error.mismatched
                      : true}
        />
        <Toggle
            tips={$locales.get((l) => l.ui.page.login.toggle.reveal)}
            on={reveal}
            toggle={() => (reveal = !reveal)}>🔎</Toggle
        >
    </p>

    <p class="center">
        {#if loading}
            <Spinning></Spinning>
        {:else}
            <Button
                background
                submit
                tip={(l) => l.ui.page.login.button.login}
                active={isValidUsername(username) &&
                    isValidPassword(password) &&
                    password === password2}
                action={() => undefined}
                >{$locales.get((l) => l.ui.page.join.header)}</Button
            >
        {/if}
    </p>
</LoginForm>

<style>
    .center {
        text-align: center;
    }
</style>
