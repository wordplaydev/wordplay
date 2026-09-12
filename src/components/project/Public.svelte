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
    import type { Snippet } from 'svelte';
    import type { Visibility } from 'shared-types';
    import type LocaleText from '@locale/LocaleText';
    import type { ModeText } from '@locale/UITexts';
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
        /** Whether to state the rules being promised. On by default, and off
         *  where another tab of the same dialog already states them — saying
         *  them twice, in words naming a project when the thing at hand is a
         *  kit, reads as off topic rather than as emphasis. */
        rules?: boolean;
        /** What private and public mean for this thing. Defaults to a project's
         *  words; a kit's toggle governs being *found* rather than being seen,
         *  so it says so in its own. */
        modes?: (locale: LocaleText) => ModeText<readonly string[]>;
        /** What to do about a decision, rendered with the flags it answers
         *  rather than after the control, which is a section away from the
         *  thing it is about. Only shown when there are flags. */
        remedy?: Snippet;
        /** Who reviews this, replacing `ResponsibilityNotice`. Its `none` case
         *  says "only visible to you and the people you choose", which is true
         *  of a private project and of nothing else: a kit has no collaborators
         *  to choose, and an unlisted kit is readable by anyone holding the
         *  borrow line. A caller whose thing doesn't fit says so itself. */
        responsibility?: Snippet;
    }

    let {
        isPublic,
        set,
        flags = undefined,
        header = true,
        checkStanding = false,
        visibility = undefined,
        rules = true,
        modes = (l) => l.ui.dialog.share.mode.public,
        remedy = undefined,
        responsibility = undefined,
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
{#if rules}
    <MarkupHTMLView
        markup={(l) => l.ui.dialog.share.subheader.public.explanation}
    />

    <MarkupHTMLView
        markup={Object.values(
            $locales.getTextStructure((l) => l.moderation.flags),
        )
            .map((promise) => `• ${withoutAnnotations(promise)}`)
            .join('\n\n')}
    />
{/if}

<!-- After the rules, not before them: the explanation above ends "your project
     does not:" and the list below is what completes that sentence, so anything
     in between splits a sentence from its own bullets. Who reviews this
     belongs with what happens next, which follows. -->
{#if responsibility}
    {@render responsibility()}
{:else if visibility}
    <ResponsibilityNotice {visibility} />
{/if}
{#if flags === undefined || Object.values(flags).every((state) => state === null)}
    <!-- What happens if the rules are broken, which only follows from having just
         stated them. Without them it is a warning about nothing. -->
    {#if rules}
        <MarkupHTMLView markup={(l) => l.ui.page.rights.consequences} />
    {/if}
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
    {#if blocked.length > 0}
        <ul>
            {#each blocked as block}
                <li><MarkupHTMLView inline markup={block} /></li>
            {/each}
        </ul>
    {/if}
    {#if warnings.length > 0}
        <Notice
            ><MarkupHTMLView
                markup={(l) => l.moderation.warning.explanation}
            /></Notice
        >
    {/if}
    {#if warnings.length > 0}
        <ul>
            {#each warnings as warn}
                <li><MarkupHTMLView inline markup={warn} /></li>
            {/each}
        </ul>
    {/if}
    {#if remedy && (blocked.length > 0 || warnings.length > 0)}
        {@render remedy()}
    {/if}
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
    {modes}
    choice={isPublic ? 1 : 0}
    select={set}
    active={!banned}
    icons={['🤫', GLOBE1_SYMBOL]}
/>
