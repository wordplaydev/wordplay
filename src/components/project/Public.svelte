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
    } from '../../db/projects/Moderation';
    import Notice from '@components/app/Notice.svelte';

    interface Props {
        isPublic: boolean;
        set: (choice: number) => void;
        flags?: ModerationState | undefined;
    }

    let { isPublic, set, flags = undefined }: Props = $props();
</script>

<Subheader text={(l) => l.ui.dialog.share.subheader.public.header} />
<MarkupHTMLView
    markup={(l) => l.ui.dialog.share.subheader.public.explanation}
/>

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

<Mode
    modes={(l) => l.ui.dialog.share.mode.public}
    choice={isPublic ? 1 : 0}
    select={set}
    icons={['🤫', GLOBE1_SYMBOL]}
/>
