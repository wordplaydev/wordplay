<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import { locales } from '@db/Database';
    import { withoutAnnotations } from '@locale/withoutAnnotations';
    import { GLOBE1_SYMBOL } from '@parser/Symbols';
    import {
        getBlocks,
        getWarnings,
        type ModerationState,
    } from '@db/projects/Moderation';
    import Notice from '@components/app/Notice.svelte';
    import ResponsibilityNotice from '@components/moderation/ResponsibilityNotice.svelte';
    import type { Visibility } from 'shared-types';
    import {
        isBanned,
        strikes,
        strikesRemaining,
    } from '@db/creators/strikes.svelte';

    interface Props {
        isPublic: boolean;
        set: (choice: number) => void;
        flags?: ModerationState | undefined;
        /** Whether this creator has lost the ability to make anything public
         *  (#193). Off by default: this component is also rendered for a
         *  gallery, whose curator's own standing is what matters there. */
        checkStanding?: boolean;
        /** Whether to title the section. Off inside the share dialog, where the
         *  tab already names it; on where this sits among other sections. */
        header?: boolean;
        /** What is being shared, so this can say who reviews it (#938). A
         *  creator deciding whether to make something public should learn who
         *  can review it before they do, not after someone reports it. */
        visibility?: Visibility | undefined;
        /** The gallery's name, when the answer names one. */
        galleryName?: string;
    }

    let {
        isPublic,
        set,
        flags = undefined,
        header = true,
        checkStanding = false,
        visibility = undefined,
        galleryName = '',
    }: Props = $props();

    // A creator's own standing, which decides whether the control below is
    // theirs to use. Read from the server-written record; the security rules
    // enforce the same thing regardless of what's rendered here.
    let banned = $derived(checkStanding && isBanned());
    let warnings = $derived(strikes.record?.count ?? 0);
</script>

{#if header}
    <Subheader text={(l) => l.ui.dialog.share.subheader.public.header} />
{/if}
<MarkupHTMLView
    markup={(l) => l.ui.dialog.share.subheader.public.explanation}
/>

{#if visibility}
    <ResponsibilityNotice {visibility} gallery={galleryName} />
{/if}

<MarkupHTMLView
    markup={Object.values($locales.getTextStructure((l) => l.moderation.flags))
        .map((promise) => `• ${withoutAnnotations(promise)}`)
        .join('\n\n')}
/>
{#if flags === undefined || Object.values(flags).every((state) => state === null)}
    <MarkupHTMLView markup={(l) => l.ui.page.rights.consequences} />
{:else if flags !== undefined}
    {@const blocked = getBlocks(flags, $locales.getLocale())}
    {@const warnings = getWarnings(flags, $locales.getLocale())}
    {#if blocked.length > 0}
        <Notice
            ><MarkupHTMLView
                markup={(l) => l.moderation.blocked.explanation}
            /></Notice
        >
    {/if}
    <ul>
        {#each blocked as block}
            <li><MarkupHTMLView inline markup={block} /></li>
        {/each}
    </ul>
    {#if warnings.length > 0}
        <Notice
            ><MarkupHTMLView
                markup={(l) => l.moderation.warning.explanation}
            /></Notice
        >
    {/if}
    <ul>
        {#each warnings as warn}
            <li><MarkupHTMLView inline markup={warn} /></li>
        {/each}
    </ul>
{/if}

<!-- What their standing means for this control. Shown above it rather than
     after a failed press: someone who can't publish should find that out when
     they look, not when they try. -->
{#if banned}
    <Notice
        ><MarkupHTMLView markup={(l) => l.moderation.strike.banned} /></Notice
    >
{:else if checkStanding && warnings > 0}
    <Notice
        ><MarkupHTMLView
            markup={[
                (l) => l.moderation.strike.warned,
                {
                    count: warnings,
                    remaining: strikesRemaining(),
                },
            ]}
        /></Notice
    >
{/if}

<Mode
    modes={(l) => l.ui.dialog.share.mode.public}
    choice={isPublic ? 1 : 0}
    select={set}
    active={!banned}
    icons={['🤫', GLOBE1_SYMBOL]}
/>
