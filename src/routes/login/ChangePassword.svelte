<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import { auth } from '@db/firebase';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { SEARCH_SYMBOL } from '@parser/Symbols';
    import { FirebaseError } from 'firebase/app';
    import {
        signInWithEmailAndPassword,
        updatePassword,
        type User,
    } from 'firebase/auth';
    import getLoginErrorDescription from './getAuthErrorDescription';
    import isValidPassword from './IsValidPassword';

    interface Props {
        user: User;
    }

    let { user }: Props = $props();

    let currentpassword = $state('');
    let password1 = $state('');
    let password2 = $state('');
    let submitted = $state(false);
    let feedback: LocaleTextAccessor | undefined = $state(undefined);
    let reveal = $state(false);

    async function update() {
        if (auth === undefined || user === null || user.email === null) return;

        try {
            // First, make sure the password is current.
            await signInWithEmailAndPassword(auth, user.email, currentpassword);

            // Then, if the new password and confirmed password match, update the password.
            if (isValidPassword(password2) && password1 === password2) {
                try {
                    submitted = true;
                    await updatePassword(user, password2);
                } catch (error) {
                    if (error instanceof FirebaseError) {
                        feedback = getLoginErrorDescription(error);
                    }
                } finally {
                    submitted = false;
                    feedback = (l) => l.ui.page.login.feedback.updatedPassword;
                    currentpassword = '';
                    password1 = '';
                    password2 = '';
                }
            }
        } catch (error) {
            feedback = (l) => l.ui.page.login.error.wrongPassword;
        }
    }
</script>

<p><LocalizedText path={(l) => l.ui.page.login.prompt.changePassword} /></p>

<form>
    <TextField
        id="currentpassword"
        kind={reveal ? undefined : 'password'}
        description={(l) => l.ui.page.login.field.currentPassword.description}
        placeholder={(l) => l.ui.page.login.field.currentPassword.placeholder}
        bind:text={currentpassword}
        editable={!submitted}
        validator={(pass) =>
            !isValidPassword(pass)
                ? (l) => l.ui.page.login.error.invalidPassword
                : true}
    />
    <TextField
        id="repeatpassword"
        kind={reveal ? undefined : 'password'}
        description={(l) => l.ui.page.login.field.newPassword.description}
        placeholder={(l) => l.ui.page.login.field.newPassword.placeholder}
        bind:text={password1}
        editable={!submitted}
        validator={(pass) =>
            !isValidPassword(pass)
                ? (l) => l.ui.page.login.error.invalidPassword
                : true}
    />
    <TextField
        id="newpassword"
        kind={reveal ? undefined : 'password'}
        description={(l) => l.ui.page.login.field.newPassword.description}
        placeholder={(l) => l.ui.page.login.field.newPassword.placeholder}
        bind:text={password2}
        editable={!submitted}
        validator={(pass) =>
            !isValidPassword(pass)
                ? (l) => l.ui.page.login.error.invalidPassword
                : pass !== password1
                  ? (l) => l.ui.page.login.error.mismatched
                  : true}
    />
    <Toggle
        tips={(l) => l.ui.page.login.toggle.reveal}
        on={reveal}
        toggle={() => (reveal = !reveal)}>{SEARCH_SYMBOL}</Toggle
    >
    <Button
        submit
        background
        tip={(l) => l.ui.page.login.button.updatePassword}
        active={!submitted && isValidPassword(password2)}
        action={update}>&gt;</Button
    >
    {#if password2.length > 0 && !isValidPassword(password2)}
        <Notice text={(l) => l.ui.page.login.prompt.passwordrule} />
    {:else if feedback}
        <Notice text={feedback} />
    {/if}
</form>

<style>
    form {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }
</style>
