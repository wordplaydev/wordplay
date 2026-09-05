<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { Creator } from '@db/creators/CreatorDatabase';
    import {
        getUsername,
        handle,
        mayUseEmail,
    } from '@db/creators/handle.svelte';
    import validEmail from '@db/creators/isValidEmail';
    import { locales } from '@db/Database';
    import { formatDate } from '@locale/birthdayFields';
    import { claimUsername, switchToPassword } from '@db/creators/signinMethod';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { ensureAppCheck } from '@db/firebase';
    import { verifyBeforeUpdateEmail, type User } from 'firebase/auth';
    import getAuthErrorDescription from './getAuthErrorDescription';
    import isValidPassword from './IsValidPassword';

    /**
     * Changing how you sign in, in both directions (#628).
     *
     * The two halves are asymmetric because proving an address is yours is a
     * different problem from giving one up. Moving *to* an address goes through
     * `verifyBeforeUpdateEmail`, which mails a confirmation; moving *away* from
     * one goes through a callable, because the destination is the synthesized
     * `@u.wordplay.dev` address that no confirmation mail could reach.
     *
     * The load-bearing rule is the claim. A username account's name lives only
     * in its synthesized address, so the instant that address is replaced the
     * name is gone — along with every `@username/Character` reference to this
     * creator's work in anyone's project. So the handle is written *first*, and
     * the switch refuses to go on if it didn't land.
     */
    interface Props {
        user: User;
    }

    let { user }: Props = $props();

    let submitting = $state(false);
    let feedback: LocaleTextAccessor | undefined = $state(undefined);
    let newEmail = $state('');
    let newPassword = $state('');

    const usesPassword = $derived(Creator.isUsername(user.email ?? ''));
    const username = $derived(getUsername(user));
    const eligible = $derived(mayUseEmail());

    /** The day they become old enough, written the way this locale writes
     *  dates. Naming the day answers the question; "when you're older" defers
     *  it, and this is a date a creator can check for themselves. */
    const eligibleOn = $derived(
        handle.record?.emailEligibleOn === undefined
            ? undefined
            : formatDate(handle.record.emailEligibleOn, $locales.getLocale()),
    );

    async function toEmail() {
        if (!validEmail(newEmail) || username === undefined) return;
        submitting = true;
        feedback = undefined;
        try {
            await ensureAppCheck();
            // First, and only then the address. Getting this order wrong loses
            // the creator their name permanently.
            const claimed = await claimUsername(username);
            if (claimed !== 'claimed' && claimed !== 'held') {
                feedback = (l) => l.ui.page.login.error.failure;
                return;
            }
            await verifyBeforeUpdateEmail(user, newEmail);
            feedback = (l) => l.ui.page.login.prompt.confirm;
        } catch (error) {
            feedback = getAuthErrorDescription(error);
        } finally {
            submitting = false;
        }
    }

    async function toPassword() {
        if (!isValidPassword(newPassword) || username === undefined) return;
        submitting = true;
        feedback = undefined;
        try {
            await ensureAppCheck();
            // Same order, same reason: an email account may have no handle yet
            // if it was made before this shipped.
            const claimed = await claimUsername(username);
            if (claimed !== 'claimed' && claimed !== 'held') {
                feedback = (l) => l.ui.page.login.error.failure;
                return;
            }
            const result = await switchToPassword(newPassword);
            feedback =
                result === 'switched'
                    ? (l) => l.ui.page.login.signin.switched
                    : (l) => l.ui.page.login.error.failure;
            if (result === 'switched') newPassword = '';
        } catch (error) {
            feedback = getAuthErrorDescription(error);
        } finally {
            submitting = false;
        }
    }
</script>

{#if usesPassword}
    <!-- One message per case, rather than an offer followed by a line taking it
         back: "if you'd rather not have a password" is not something to say to
         someone who has no choice about it. -->
    {#if eligible}
        <MarkupHTMLView markup={(l) => l.ui.page.login.signin.usesPassword} />
        <form onsubmit={toEmail}>
            <TextField
                id="switch-email-field"
                kind="email"
                description={(l) => l.ui.page.login.field.email.description}
                placeholder={(l) => l.ui.page.login.field.email.placeholder}
                bind:text={newEmail}
                editable={!submitting}
            />
            <Button
                submit
                background
                tip={(l) => l.ui.page.login.button.updateEmail}
                active={validEmail(newEmail) && username !== undefined}
                action={toEmail}>&gt;</Button
            >
        </form>
    {:else}
        <MarkupHTMLView
            markup={[
                (l) => l.ui.page.login.signin.notYet,
                { date: eligibleOn ?? '' },
            ]}
        />
    {/if}
{:else}
    <MarkupHTMLView markup={(l) => l.ui.page.login.signin.usesEmail} />
    <form onsubmit={toPassword}>
        <TextField
            id="switch-password-field"
            kind="password"
            description={(l) => l.ui.page.login.field.password.description}
            placeholder={(l) => l.ui.page.login.field.password.placeholder}
            bind:text={newPassword}
            editable={!submitting}
            validator={(pass) =>
                pass === '' || isValidPassword(pass)
                    ? true
                    : (l) => l.ui.page.login.error.invalidPassword}
        />
        <Button
            submit
            background
            tip={(l) => l.ui.page.login.signin.toPassword.tip}
            label={(l) => l.ui.page.login.signin.toPassword.label}
            active={isValidPassword(newPassword) && username !== undefined}
            action={toPassword}
        />
    </form>
{/if}

{#if submitting}
    <Spinning label={(l) => l.ui.page.login.feedback.changing} />
{:else if feedback}
    <Notice inline text={feedback} />
{/if}
