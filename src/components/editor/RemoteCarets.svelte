<!--
  Renders a list of remote collaborators editing the same project as the
  current user. For each peer, shows a colored badge with their character
  + name + which source they're in. The component subscribes to the
  PresenceTracker's reactive `peers` map (see PresenceTracker.svelte.ts)
  and updates as peers join, leave, or move their caret.

  Stage 4 of issue #135 / collaborative editing. Future work: anchor each
  peer's caret to its exact character position by reusing CaretView's
  DOM-positioning math (this component currently shows peers only as a
  list rather than as floating overlays on the source).
-->
<script lang="ts">
    import { Projects } from '@db/Database';
    import { isPresenceStale } from '@db/projects/ProjectPresence';
    import { Focals } from '@output/BasicColors';
    import { onDestroy } from 'svelte';

    interface Props {
        projectID: string;
        /** Source index currently focused in the editor. Peers editing
         *  this source are highlighted; others are dimmed. */
        activeSourceIndex?: number;
    }

    let { projectID, activeSourceIndex = -1 }: Props = $props();

    let tracker = $derived(Projects.getPresenceTracker(projectID));

    // Re-render every 5s so the staleness fade reflects elapsed time.
    let now = $state(Date.now());
    const tick = setInterval(() => (now = Date.now()), 5_000);
    onDestroy(() => clearInterval(tick));

    let peers = $derived(
        tracker === undefined
            ? []
            : Array.from(tracker.peers.values()).filter(
                  (p) => !isPresenceStale(p, now),
              ),
    );

    function cssColor(bct: string): string {
        const f = Focals[bct as keyof typeof Focals];
        if (f === undefined) return 'currentColor';
        return `oklch(${f.l} ${f.c / 100} ${f.h})`;
    }
</script>

{#if peers.length > 0}
    <ul class="remote-carets" aria-label="Collaborators editing this project">
        {#each peers as peer (peer.clientID)}
            <li
                class="peer"
                class:active={peer.sourceIndex === activeSourceIndex}
                style:background-color={cssColor(peer.color)}
                title={`Source ${peer.sourceIndex} · ${peer.color}`}
            >
                <span class="dot" aria-hidden="true"></span>
                <span class="name">{peer.userID ?? peer.clientID.slice(0, 6)}</span>
            </li>
        {/each}
    </ul>
{/if}

<style>
    .remote-carets {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        list-style: none;
        margin: 0;
        padding: 0;
    }

    .peer {
        display: inline-flex;
        align-items: center;
        gap: calc(var(--wordplay-spacing) / 2);
        padding: calc(var(--wordplay-spacing) / 2)
            var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        font-size: var(--wordplay-small-font-size);
        color: var(--wordplay-background);
        opacity: 0.5;
        transition: opacity 200ms;
    }

    .peer.active {
        opacity: 1;
    }

    .dot {
        display: inline-block;
        width: 0.6em;
        height: 0.6em;
        border-radius: 50%;
        background-color: var(--wordplay-background);
    }

    .name {
        font-family: var(--wordplay-app-font);
        max-width: 8em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
</style>
