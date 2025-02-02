<script lang="ts">
    import TextField from '@components/widgets/TextField.svelte';
    import Feedback from '../../components/app/Feedback.svelte';
    import { locales } from '@db/Database';
    import { verifyBeforeUpdateEmail } from 'firebase/auth';
    import type { User } from 'firebase/auth';
    import Spinning from '@components/app/Spinning.svelte';
    import Button from '@components/widgets/Button.svelte';
    import validEmail from '@db/creators/isValidEmail';
    import getLoginErrorDescription from './getAuthErrorDescription';

    interface Props {
        user: User;
    }

    let { user }: Props = $props();

    let changeSubmitted = $state(false);
    let changeFeedback: string | undefined = $state(undefined);
    let newEmail: string = $state('');

    async function update() {
        // Enter loading state, try to login and wait for it to complete, and then leave loading state.
        // Give some feedback when loading.
        changeSubmitted = true;
        try {
            await verifyBeforeUpdateEmail(user, newEmail);
            changeFeedback = $locales.get(
                (l) => l.ui.page.login.prompt.confirm,
            );
        } catch (error) {
            changeFeedback = getLoginErrorDescription($locales, error);
        } finally {
            changeSubmitted = false;
        }
    }
</script>

<p>{$locales.get((l) => l.ui.page.login.prompt.changeEmail)}</p>
<form onsubmit={update}>
    <TextField
        description={$locales.get(
            (l) => l.ui.page.login.field.email.description,
        )}
        placeholder={$locales.get(
            (l) => l.ui.page.login.field.email.placeholder,
        )}
        bind:text={newEmail}
        editable={!changeSubmitted}
    /><Button
        submit
        background
        tip={$locales.get((l) => l.ui.page.login.button.updateEmail)}
        active={validEmail(newEmail)}
        action={() => undefined}>&gt;</Button
    >
    {#if changeSubmitted}<Spinning
            label={$locales.get((l) => l.ui.page.login.feedback.changing)}
        />
    {:else if changeFeedback}<Feedback inline>{changeFeedback}</Feedback>{/if}
</form>
