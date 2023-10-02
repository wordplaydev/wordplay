<script lang="ts">
    import Dialog from '@components/widgets/Dialog.svelte';
    import { locale } from '../../db/Database';
    import type Project from '../../models/Project';
    import { getUser } from './Contexts';
    import {
        getWarnings,
        getBlocks,
        getUnmoderated,
        isAudience,
    } from '../../models/Moderation';
    import MarkupHtmlView from '../concepts/MarkupHTMLView.svelte';

    export let show: boolean;
    export let project: Project;

    const user = getUser();

    /** See if this is a public project being viewed by someone who isn't a creator or collaborator */
    $: audience = isAudience($user, project);
    $: warnings = getWarnings(project.flags, $locale);
    $: blocks = getBlocks(project.flags, $locale);
    $: unmoderated = getUnmoderated(project.flags, $locale);
</script>

<!-- If this is an audience member and one of the flags are active -->
{#if show && audience && warnings.length + blocks.length + unmoderated.length > 0}
    <Dialog
        bind:show
        description={blocks.length > 0
            ? $locale.moderation.blocked
            : warnings.length > 0
            ? $locale.moderation.warning
            : $locale.moderation.unmoderated}
        closeable={blocks.length === 0}
    >
        <ul>
            {#each blocks.length > 0 ? blocks : warnings.length > 0 ? warnings : unmoderated as description}
                <li><MarkupHtmlView inline markup={description} /></li>
            {/each}
        </ul>
    </Dialog>
{/if}

<style>
</style>
