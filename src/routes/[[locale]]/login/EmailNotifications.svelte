<script lang="ts">
    import Nested from '@components/app/Nested.svelte';
    import Notice from '@components/app/Notice.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import { Creator } from '@db/creators/CreatorDatabase';
    import { mayUseEmail } from '@db/creators/handle.svelte';
    import { emailNotifications, Settings } from '@db/Database';
    import { wants } from '@db/settings/EmailNotificationsSetting';
    import type { EmailNotificationSettings } from 'shared-types';
    import type { User } from 'firebase/auth';

    /**
     * Which emails Wordplay sends.
     *
     * Sits inside the profile's email block, under the control that gets you an
     * address in the first place — which is what lets this say "above" and mean
     * it. On the profile rather than in the settings dialog because whether we
     * write to someone is a property of their account, not of the device they
     * happened to choose it on.
     *
     * Three groups rather than a switch per notice kind: the question being
     * answered is "why would you write to me", and there are three honest
     * answers.
     */
    interface Props {
        user: User;
    }

    let { user }: Props = $props();

    /** A username account signs in with a synthesized address that receives no
     *  mail, so there is nothing here to choose yet. */
    const mailable = $derived(!Creator.isUsername(user.email ?? ''));

    /** Whether they are old enough to hold an address at all. Without this,
     *  someone below the age of consent is told to add one — directly under the
     *  paragraph explaining that they cannot yet, which `SigninMethod` shows
     *  with the date they become eligible. Same gate the moderation page uses
     *  before inviting a reviewer to add an address. */
    const eligible = $derived(mayUseEmail());

    function choose(group: keyof EmailNotificationSettings, on: boolean) {
        Settings.setEmailNotifications({ ...$emailNotifications, [group]: on });
    }
</script>

<!-- One level down, so this reads as part of the email block rather than as a
     block of its own. -->
<Nested>
    <Subheader text={(l) => l.ui.page.login.notifications.header} />
    {#if mailable}
        <!-- A grid rather than a stack, so every off/on sits in one column
             instead of wherever its own label happens to end. Each Mode
             contributes its two cells through `grid` (`display: contents`),
             the way the settings dialog's controls do. -->
        <div class="choices">
            {#each ['decisions', 'reviews', 'activity'] as const as group (group)}
                <Mode
                    grid
                    modes={(l) => l.ui.page.login.notifications[group]}
                    choice={wants($emailNotifications, group) ? 1 : 0}
                    select={(index) => choose(group, index === 1)}
                />
            {/each}
        </div>
    {:else}
        <!-- The choices themselves are left out rather than shown inert: there
             is nowhere for any of them to arrive, and a control that cannot do
             anything invites a second question about why. Which of the two
             things to say depends on whether adding an address is something
             they can actually go and do. -->
        <Notice
            text={(l) =>
                eligible
                    ? l.ui.page.login.notifications.noAddress
                    : l.ui.page.login.notifications.notYet}
        />
    {/if}
</Nested>

<style>
    .choices {
        display: grid;
        /* The description takes what it needs and the controls share one
           column, so the off/on pairs line up down the block. */
        grid-template-columns: minmax(0, 1fr) max-content;
        column-gap: var(--wordplay-spacing);
        row-gap: var(--wordplay-spacing);
        align-items: baseline;
    }

    /* `Mode`'s grid label right-aligns, which suits the short labels of a
       filter row. These are sentences of differing length, so ending them on a
       shared edge leaves a ragged left one — and the reader is scanning down
       the list, not across to the control. */
    .choices :global(.mode.grid .label) {
        justify-self: start;
        text-align: start;
        /* `Mode` sets `white-space: nowrap`, which suits a filter row of one or
           two words. These are sentences, and in a card this narrow they were
           being cut off mid-word rather than wrapping. */
        white-space: normal;
    }
</style>
