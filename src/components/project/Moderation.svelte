<script lang="ts">
    import Dialog from '@components/widgets/Dialog.svelte';
    import { locales } from '../../db/Database';
    import {
        getBlocks,
        getUnmoderated,
        getWarnings,
        isAudience,
    } from '../../db/projects/Moderation';
    import type Project from '../../db/projects/Project';
    import MarkupHTMLView from '../concepts/MarkupHTMLView.svelte';
    import { getUser } from './Contexts';

    interface Props {
        project: Project;
    }

    let { project }: Props = $props();

    const user = getUser();

    /** See if this is a public project being viewed by someone who isn't a creator or collaborator */
    let audience = $derived(isAudience($user, project));
    let warnings = $derived(
        getWarnings(project.getFlags(), $locales.getLocale()),
    );
    let blocks = $derived(getBlocks(project.getFlags(), $locales.getLocale()));
    let unmoderated = $derived(
        getUnmoderated(project.getFlags(), $locales.getLocale()),
    );
</script>

<!-- If this is an audience member and one of the flags are active -->
{#if audience && warnings.length + blocks.length + unmoderated.length > 0}
    <Dialog
        show
        header={blocks.length > 0
            ? (l) => l.moderation.blocked.header
            : warnings.length > 0
              ? (l) => l.moderation.warning.header
              : (l) => l.moderation.unmoderated.header}
        explanation={blocks.length > 0
            ? (l) => l.moderation.blocked.explanation
            : warnings.length > 0
              ? (l) => l.moderation.warning.explanation
              : (l) => l.moderation.unmoderated.explanation}
        closeable={blocks.length === 0}
    >
        <ul>
            {#each blocks.length > 0 ? blocks : warnings.length > 0 ? warnings : unmoderated as description}
                <li><MarkupHTMLView inline markup={description} /></li>
            {/each}
        </ul>
    </Dialog>
{/if}
