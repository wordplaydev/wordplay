<script lang="ts">
    import ProjectPreview from '@components/app/ProjectPreview.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Notice from '@components/app/Notice.svelte';
    import { isDialogOpenInURL } from '@components/widgets/dialogURL';
    import { Projects } from '@db/projects/Projects';
    import type Project from '@db/projects/Project';
    import { ExamplePrefix } from '../../examples/examples';

    interface Props {
        project: Project;
        /** Whether the viewer can edit this project. Only they get to see who
         *  has remixed it; the provenance link above is for everyone. */
        editable: boolean;
    }

    let { project, editable }: Props = $props();

    // A Dialog's children are always in the DOM — it only hides the <dialog>
    // element — so loading "on demand" needs an explicit open signal. The URL
    // is the one source of truth Dialog already maintains for id="share", and
    // unlike a bound `show` prop it can't be confused by the inert measurement
    // clones OverflowToolbar renders of the whole share item.
    let active = $derived(isDialogOpenInURL('share'));

    let sourceID = $derived(project.getRemixOf());
    // Examples live in static files, not Firestore, so they can't be queried.
    let queryable = $derived(!project.getID().startsWith(ExamplePrefix));

    /** undefined while loading, null when the source can't be resolved. */
    let source = $state<Project | undefined | null>(undefined);
    let remixes = $state<Project[] | undefined>(undefined);

    $effect(() => {
        if (!active || sourceID === null) return;
        let cancelled = false;
        Projects.get(sourceID)
            .then((found) => {
                if (!cancelled) source = found ?? null;
            })
            .catch(() => {
                if (!cancelled) source = null;
            });
        return () => {
            cancelled = true;
        };
    });

    $effect(() => {
        if (!active || !editable || !queryable) return;
        let cancelled = false;
        Projects.getRemixes(project.getID())
            .then((found) => {
                if (!cancelled) remixes = found;
            })
            .catch(() => {
                if (!cancelled) remixes = [];
            });
        return () => {
            cancelled = true;
        };
    });

    let hasRemixes = $derived(remixes !== undefined && remixes.length > 0);

    // Only public remixes can be listed — the security rules reject a query
    // this viewer can't prove is readable, so a remix stays invisible until
    // its creator shares it. Say so on a public project the viewer owns,
    // rather than rendering nothing: silence is indistinguishable from
    // "broken" to someone who just watched a remix of theirs get made.
    let explainEmpty = $derived(
        editable &&
            queryable &&
            project.isPublic() &&
            remixes !== undefined &&
            remixes.length === 0,
    );
</script>

<!-- No header: the share dialog's tab already names this section. The
     explanation renders unconditionally because this is a tab panel and an
     empty one is a dead end — when a project is neither a remix nor yet
     remixed, saying what remixing is is the useful thing to show. -->
<MarkupHTMLView markup={(l) => l.ui.dialog.share.subheader.remix.explanation} />

{#if sourceID !== null}
    <MarkupHTMLView markup={(l) => l.ui.dialog.share.remix.source} />
    {#if source === undefined}
        <Spinning />
    {:else if source === null}
        <Notice text={(l) => l.ui.dialog.share.remix.unknown} />
    {:else}
        <ProjectPreview project={source} showOwner />
    {/if}
{/if}

{#if explainEmpty}
    <MarkupHTMLView markup={(l) => l.ui.dialog.share.remix.none} />
{/if}

{#if hasRemixes && remixes}
    <MarkupHTMLView markup={(l) => l.ui.dialog.share.remix.remixes} />
    <div class="remixes">
        {#each remixes as remix (remix.getID())}
            <ProjectPreview project={remix} showOwner />
        {/each}
    </div>
{/if}

<style>
    .remixes {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: calc(2 * var(--wordplay-spacing));
        align-items: start;
    }
</style>
