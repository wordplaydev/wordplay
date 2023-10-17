<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import { locales } from '@db/Database';
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

<Subheader
    >{$locales.get((l) => l.ui.dialog.share.subheader.public.header)}</Subheader
>
<MarkupHtmlView
    markup={$locales.get((l) => l.ui.dialog.share.subheader.public.explanation)}
/>

<MarkupHtmlView
    markup={Object.values($locales.get((l) => l.moderation.flags))
        .map((promise) => `• ${promise}`)
        .join('\n\n')}
/>
{#if flags === undefined || Object.values(flags).every((state) => state === null)}
    <MarkupHtmlView
        markup={$locales.get((l) => l.ui.page.rights.consequences)}
    />
{:else if flags !== undefined}
    {@const blocked = getBlocks(flags, $locales.getLocale())}
    {@const warnings = getWarnings(flags, $locales.getLocale())}
    {#if blocked.length > 0}
        <Warning
            ><MarkupHtmlView
                markup={$locales.get((l) => l.moderation.blocked.explanation)}
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
                markup={$locales.get((l) => l.moderation.warning.explanation)}
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
        descriptions={$locales.get((l) => l.ui.dialog.share.mode.public)}
        choice={isPublic ? 1 : 0}
        select={set}
        modes={[
            '🤫 ' + $locales.get((l) => l.ui.dialog.share.mode.public.modes[0]),
            '🌐 ' + $locales.get((l) => l.ui.dialog.share.mode.public.modes[1]),
        ]}
    /></p
>

<style>
    p {
        margin-top: var(--wordplay-spacing);
    }
</style>
