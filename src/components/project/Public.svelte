<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import { locale } from '@db/Database';
    import {
        getBlocks,
        getWarnings,
        type Moderation,
    } from '../../models/Moderation';
    import Warning from '../widgets/Warning.svelte';

    export let isPublic: boolean;
    export let set: (choice: number) => void;
    export let flags: Moderation | undefined = undefined;
</script>

<Subheader>{$locale.ui.dialog.share.subheader.public.header}</Subheader>
<MarkupHtmlView markup={$locale.ui.dialog.share.subheader.public.explanation} />

<MarkupHtmlView
    markup={Object.values($locale.moderation.flags)
        .map((promise) => `• ${promise}`)
        .join('\n\n')}
/>
{#if flags === undefined || Object.values(flags).every((state) => state === null)}
    <MarkupHtmlView markup={$locale.ui.page.rights.consequences} />
{:else if flags !== undefined}
    {@const blocked = getBlocks(flags, $locale)}
    {@const warnings = getWarnings(flags, $locale)}
    {#if blocked.length > 0}
        <Warning
            ><MarkupHtmlView
                markup={$locale.moderation.blocked.explanation}
            /></Warning
        >
    {/if}
    <ul>
        {#each blocked as block}
            <li><MarkupHtmlView inline markup={block} /></li>
        {/each}
    </ul>
    {#if warnings.length > 0}
        <Warning
            ><MarkupHtmlView
                markup={$locale.moderation.warning.explanation}
            /></Warning
        >
    {/if}
    <ul>
        {#each warnings as warn}
            <li><MarkupHtmlView inline markup={warn} /></li>
        {/each}
    </ul>
{/if}
<p>
    <Mode
        descriptions={$locale.ui.dialog.share.mode.public}
        choice={isPublic ? 1 : 0}
        select={set}
        modes={[
            '🤫 ' + $locale.ui.dialog.share.mode.public.modes[0],
            '🌐 ' + $locale.ui.dialog.share.mode.public.modes[1],
        ]}
    /></p
>

<style>
    p {
        margin-top: var(--wordplay-spacing);
    }
</style>
