<!--
  Renders one floating caret line + small name chip per remote collaborator
  whose presence currently points at THIS editor's source. Mounted inside
  the editor div so its absolute-positioned children inherit the editor's
  positioning context.

  Position is recomputed on a tick (every animation frame while the editor
  is hovered, otherwise lazily) using the same DOM-anchoring strategy as
  CaretView: query the token's stable `data-id`, measure the substring
  inside it. See computeRemoteCaretLocation. Block-mode Node selections
  and selection ranges fall back to the editor-footer chip only — we don't
  paint a line for them.
-->
<script lang="ts">
    import { Projects } from '@db/Database';
    import { isPresenceStale } from '@db/projects/ProjectPresence';
    import { Focals } from '@output/BasicColors';
    import type Source from '@nodes/Source';
    import { onDestroy } from 'svelte';
    import {
        computeRemoteCaretLocation,
        type RemoteCaretLocation,
    } from './remoteCaretLocation';

    interface Props {
        projectID: string;
        /** Index of this editor's source in the project. */
        sourceIndex: number;
        /** The Source object whose tokens we'll query in the DOM. */
        source: Source;
        /** The editor's root viewport — used as the coordinate origin. */
        viewport: HTMLElement | undefined;
        /** True when the editor is in block mode (affects substring measurement). */
        blocks: boolean;
    }

    let { projectID, sourceIndex, source, viewport, blocks }: Props =
        $props();

    let tracker = $derived(Projects.getPresenceTracker(projectID));

    // Re-render on a slow tick so positions follow scroll, zoom, and remote
    // edits. The viewport's own resize-observer would catch most cases, but
    // a wall-clock tick is dirt cheap and keeps the code small.
    let now = $state(Date.now());
    const heartbeat = setInterval(() => (now = Date.now()), 500);
    onDestroy(() => clearInterval(heartbeat));

    /** Peers whose caret falls inside this source as a text-mode integer
     *  position — those are the ones we can anchor a line for. Peers in
     *  Node/Path or range positions are left to the footer chip. */
    let anchored = $derived.by(() => {
        if (tracker === undefined || viewport === undefined) return [];
        const out: {
            id: string;
            color: string;
            name: string;
            location: RemoteCaretLocation;
        }[] = [];
        // `now` is read so that this $derived re-runs on the heartbeat
        // (Svelte tracks the read; the value itself isn't used in the math).
        void now;
        for (const peer of tracker.peers.values()) {
            if (isPresenceStale(peer)) continue;
            if (peer.sourceIndex !== sourceIndex) continue;
            if (typeof peer.caret !== 'number') continue;
            const location = computeRemoteCaretLocation(
                source,
                peer.caret,
                viewport,
                blocks,
            );
            if (location === undefined) continue;
            const focal = Focals[peer.color];
            const css = `oklch(${focal.l} ${focal.c / 100} ${focal.h})`;
            out.push({
                id: peer.clientID,
                color: css,
                name: peer.userID ?? peer.clientID.slice(0, 6),
                location,
            });
        }
        return out;
    });
</script>

{#each anchored as peer (peer.id)}
    <div
        class="remote-caret"
        aria-hidden="true"
        style:left="{peer.location.left}px"
        style:top="{peer.location.top}px"
        style:height="{peer.location.height}px"
        style:--peer-color={peer.color}
    >
        <span class="line"></span>
        <span class="chip">{peer.name}</span>
    </div>
{/each}

<style>
    .remote-caret {
        position: absolute;
        pointer-events: none;
        z-index: 5;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
    }
    .line {
        display: block;
        width: 2px;
        height: 100%;
        background: var(--peer-color);
        opacity: 0.85;
    }
    .chip {
        position: absolute;
        top: -1.2em;
        left: 0;
        font-family: var(--wordplay-app-font);
        font-size: 0.7em;
        line-height: 1;
        padding: 1px 4px;
        border-radius: 2px;
        background: var(--peer-color);
        color: var(--wordplay-background);
        white-space: nowrap;
        max-width: 8em;
        overflow: hidden;
        text-overflow: ellipsis;
    }
</style>
