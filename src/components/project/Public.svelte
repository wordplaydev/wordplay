<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import { locales } from '@db/Database';
    import { GLOBE1_SYMBOL } from '@parser/Symbols';
    import {
        getBlocks,
        getWarnings,
        type Moderation,
    } from '../../db/projects/Moderation';
    import Warning from '../widgets/Warning.svelte';

    interface Props {
        isPublic: boolean;
        set: (choice: number) => void;
        flags?: Moderation | undefined;
    }

    let { isPublic, set, flags = undefined }: Props = $props();
</script>

<Subheader text={(l) => l.ui.dialog.share.subheader.public.header} />
<MarkupHTMLView
    markup={(l) => l.ui.dialog.share.subheader.public.explanation}
/>

<MarkupHTMLView
    markup={Object.values($locales.get((l) => l.moderation.flags))
        .map((promise) => `• ${promise}`)
        .join('\n\n')}
/>
{#if flags === undefined || Object.values(flags).every((state) => state === null)}
    <MarkupHTMLView markup={(l) => l.ui.page.rights.consequences} />
{:else if flags !== undefined}
    {@const blocked = getBlocks(flags, $locales.getLocale())}
    {@const warnings = getWarnings(flags, $locales.getLocale())}
    {#if blocked.length > 0}
        <Warning
            ><MarkupHTMLView
                markup={(l) => l.moderation.blocked.explanation}
            /></Warning
        >
    {/if}
    <ul>
        {#each blocked as block}
            <li><MarkupHTMLView inline markup={block} /></li>
        {/each}
    </ul>
    {#if warnings.length > 0}
        <Warning
            ><MarkupHTMLView
                markup={(l) => l.moderation.warning.explanation}
            /></Warning
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
