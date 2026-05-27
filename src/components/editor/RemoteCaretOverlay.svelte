<!--
  Renders one of three indicators per remote collaborator, depending on
  what their caret currently selects:

    - **point**: a floating caret line + name flag at the character the
      peer's caret is on. The flag clamps inside the editor's bounds
      (flips below the caret near the top, anchors right near the right
      edge) and uses an editor-background fill + editor-foreground text
      with the peer's color as the border and speech-bubble tail.
    - **range**: a translucent rounded outline over the selected text
      span, drawn with the same geometry as the local user's own range
      highlight (getRangeOutline) but in the peer's color.
    - **node**: a translucent rounded outline around the selected AST
      node, drawn with the same geometry as the local user's own node
      selection (getOutlineOf on the node's DOM element) but in the
      peer's color.

  Everything is decoded against the local Y.Text / Source per render
  via caretEncoding.decodeRemoteCaret, so a peer's caret follows the
  content (or AST node) it was anchored to, not the integer index it
  was originally typed at. See ProjectsDatabase.activateCRDT for the
  Y.Doc → Source bridge that produces the source we resolve against.
-->
<script lang="ts">
    import type { Creator } from '@db/creators/CreatorDatabase';
    import { Creators, Projects } from '@db/Database';
    import { decodeRemoteCaret } from '@db/projects/caretEncoding';
    import {
        assignDistinctColors,
        isPresenceStale,
    } from '@db/projects/ProjectPresence';
    import Node from '@nodes/Node';
    import type Source from '@nodes/Source';
    import { Focals } from '@output/BasicColors';
    import { onDestroy, untrack } from 'svelte';
    import { getRangeOutline } from './highlights/Highlights';
    import type { Outline } from './highlights/outline';
    import getOutlineOf from './highlights/outline';
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
        /** The editor's root viewport — used as the coordinate origin
         *  and for clamping the flag within visible bounds. Bind-this
         *  in Editor.svelte starts at null and switches to the element
         *  after mount, so null is the pre-mount value to expect. */
        viewport: HTMLElement | null | undefined;
        /** True when the editor is in block mode (affects substring
         *  measurement + outline shape). */
        blocks: boolean;
        /** Resolves a Node to its rendered DOM element. Threaded down
         *  from Editor.svelte because range and node outlines need to
         *  measure rendered token rects. */
        getNodeView: (node: Node) => HTMLElement | undefined;
        /** Right-to-left layout — flips the outline geometry the same
         *  way the local user's range highlight handles RTL. */
        rtl: boolean;
    }

    let {
        projectID,
        sourceIndex,
        source,
        viewport,
        blocks,
        getNodeView,
        rtl,
    }: Props = $props();

    let tracker = $derived(Projects.getPresenceTracker(projectID));

    // Re-render on a slow tick so positions follow scroll, zoom, and
    // remote edits. The viewport's own resize-observer would catch
    // most cases, but a wall-clock tick is dirt cheap and keeps the
    // code small.
    let now = $state(Date.now());
    const heartbeat = setInterval(() => (now = Date.now()), 500);
    onDestroy(() => clearInterval(heartbeat));

    // Resolve peer userIDs → Creator for displaying the username on
    // the floating caret flag. Async, cached locally; CreatorDatabase
    // memoizes its own lookups so re-asking for the same UID is
    // cheap. Without this, the flag falls back to the raw Firebase
    // UID which isn't what anyone wants to see.
    let creators: Record<string, Creator | null> = $state({});
    $effect(() => {
        if (tracker === undefined) return;
        const missing: string[] = [];
        for (const p of tracker.peers.values()) {
            if (p.userID === null) continue;
            if (!(p.userID in untrack(() => creators))) missing.push(p.userID);
        }
        if (missing.length === 0) return;
        void Creators.getCreatorsByUIDs(missing).then((map) => {
            const next = { ...untrack(() => creators) };
            for (const [uid, c] of Object.entries(map)) next[uid] = c;
            creators = next;
        });
    });

    // Subscribe to the local CRDT so we can decode each peer's caret
    // against the current Y.Text — the published RelativePosition
    // resolves to the right absolute index *after* every concurrent
    // insert/delete since the peer last published.
    let crdt = $derived(Projects.getProjectCRDT(projectID));

    /** Approximate flag dimensions used for the edge-clamp decisions
     *  on point overlays. Doesn't need to be exact — these are
     *  heuristics for "is there enough room?" — and using rough pixel
     *  values avoids having to measure the rendered flag (which would
     *  require a second layout pass and create flicker). */
    const FLAG_VERTICAL_ROOM_PX = 22;
    const FLAG_CHAR_WIDTH_PX = 7;
    const FLAG_PADDING_PX = 14;

    /** Narrowing helper to tell a Path apart from a [number, number]
     *  range — both are arrays after decodeRemoteCaret returns. */
    function isRangeTuple(v: readonly unknown[]): v is [number, number] {
        return (
            v.length === 2 &&
            typeof v[0] === 'number' &&
            typeof v[1] === 'number'
        );
    }

    type PeerCommon = { id: string; color: string; name: string };
    type PeerPoint = PeerCommon & {
        kind: 'point';
        location: RemoteCaretLocation;
        flipDown: boolean;
        flipLeft: boolean;
    };
    type PeerRange = PeerCommon & {
        kind: 'range';
        outline: Outline;
    };
    type PeerNode = PeerCommon & {
        kind: 'node';
        outline: Outline;
    };
    type PeerOverlay = PeerPoint | PeerRange | PeerNode;

    let overlays: PeerOverlay[] = $derived.by(() => {
        // viewport == null catches both `undefined` (initial render
        // before the parent's bind:this has fired) and `null` (the
        // parent's $state declares `editor: HTMLElement | null` with a
        // null initial value). Firefox surfaces the null-not-undefined
        // case as a TypeError when accessing clientWidth below.
        if (tracker === undefined || viewport == null) return [];
        if (crdt === undefined) return [];
        // `now` is read so this $derived re-runs on the heartbeat
        // (Svelte tracks the read; the value itself isn't used).
        void now;
        const viewportWidth = viewport.clientWidth;

        // Local-derive a distinct color per peer (including ourselves
        // in the input so our color reserves a slot — see
        // assignDistinctColors's docs for why).
        const livePeers = Array.from(tracker.peers.values()).filter(
            (p) => !isPresenceStale(p),
        );
        const colorByClient = assignDistinctColors([
            tracker.clientID,
            ...livePeers.map((p) => p.clientID),
        ]);
        const yText = crdt.getYText(sourceIndex);

        const out: PeerOverlay[] = [];
        for (const peer of livePeers) {
            if (peer.sourceIndex !== sourceIndex) continue;
            const decoded = decodeRemoteCaret(peer.caret, yText, source);
            if (decoded === null) continue;
            const colorKey = colorByClient.get(peer.clientID) ?? peer.color;
            const focal = Focals[colorKey];
            const color = `oklch(${focal.l} ${focal.c / 100} ${focal.h})`;
            const creator = peer.userID === null ? null : creators[peer.userID];
            const name =
                creator?.getUsername(false) ??
                creator?.getName() ??
                peer.clientID.slice(0, 6);
            const common = { id: peer.clientID, color, name };

            if (typeof decoded === 'number') {
                const location = computeRemoteCaretLocation(
                    source,
                    decoded,
                    viewport,
                    blocks,
                );
                if (location === undefined) continue;
                const flipDown = location.top < FLAG_VERTICAL_ROOM_PX;
                const flagWidth =
                    name.length * FLAG_CHAR_WIDTH_PX + FLAG_PADDING_PX;
                const flipLeft = location.left + flagWidth > viewportWidth;
                out.push({
                    ...common,
                    kind: 'point',
                    location,
                    flipDown,
                    flipLeft,
                });
                continue;
            }

            if (Array.isArray(decoded) && isRangeTuple(decoded)) {
                // Range selection — draw the same outline geometry the
                // local user sees for their own range highlight, just
                // tinted in the peer's color.
                const outline = getRangeOutline(
                    source,
                    decoded[0],
                    decoded[1],
                    getNodeView,
                    true,
                    rtl,
                    blocks,
                );
                if (outline === undefined) continue;
                out.push({ ...common, kind: 'range', outline });
                continue;
            }

            // Path — block-mode node selection. Resolve it to a Node in
            // the local source, then outline that node's rendered view
            // (same geometry as the local user's own selection).
            if (Array.isArray(decoded)) {
                const node = source.root.resolvePath(decoded);
                if (node === undefined) continue;
                const nodeView = getNodeView(node);
                if (nodeView === undefined) continue;
                const outline = getOutlineOf(nodeView, true, rtl, blocks);
                out.push({ ...common, kind: 'node', outline });
            }
        }
        return out;
    });

    /** Padding the Highlight component bakes into its SVG viewport so
     *  rounded-corner geometry near the edge isn't clipped. We mirror
     *  it for visual parity with the local user's highlights. */
    const HIGHLIGHT_PADDING = 20;
</script>

{#each overlays as peer (peer.id)}
    {#if peer.kind === 'point'}
        <div
            class="remote-caret"
            class:flip-down={peer.flipDown}
            class:flip-left={peer.flipLeft}
            aria-hidden="true"
            style:left="{peer.location.left}px"
            style:top="{peer.location.top}px"
            style:height="{peer.location.height}px"
            style:--peer-color={peer.color}
        >
            <span class="line"></span>
            <span class="flag">
                <span class="flag-tail" aria-hidden="true"></span>
                <span class="flag-text">{peer.name}</span>
            </span>
        </div>
    {:else}
        <!-- Range or node — both render as an SVG outline path with the
             peer's color stroking the border and tinting the fill. The
             container's coordinate system is editor-relative because
             getRangeOutline / getOutlineOf already normalize to the
             nearest .editor ancestor. -->
        <svg
            class="peer-highlight {peer.kind}"
            aria-hidden="true"
            style:top="{peer.outline.miny - HIGHLIGHT_PADDING}px"
            style:left="{peer.outline.minx - HIGHLIGHT_PADDING}px"
            style:--peer-color={peer.color}
            width={peer.outline.maxx -
                peer.outline.minx +
                HIGHLIGHT_PADDING * 2}
            height={peer.outline.maxy -
                peer.outline.miny +
                HIGHLIGHT_PADDING * 2}
            viewBox={`${peer.outline.minx - HIGHLIGHT_PADDING} ${
                peer.outline.miny - HIGHLIGHT_PADDING
            } ${
                peer.outline.maxx -
                peer.outline.minx +
                HIGHLIGHT_PADDING * 2 -
                1
            } ${
                peer.outline.maxy -
                peer.outline.miny +
                HIGHLIGHT_PADDING * 2 -
                1
            }`}
        >
            <path d={peer.outline.path} />
        </svg>
    {/if}
{/each}

<style>
    .remote-caret {
        position: absolute;
        pointer-events: none;
        /* Below the local user's CaretView (z-index 6 in CaretView.svelte)
           so the local caret always renders on top of remote-peer carets
           and their flags — the local user's "where am I" indicator
           should never be obscured by a passing collaborator. */
        z-index: 4;
    }
    .line {
        display: block;
        width: 2px;
        height: 100%;
        background: var(--peer-color);
        opacity: 0.85;
    }
    .flag {
        position: absolute;
        /* Default placement: just above the caret, left-anchored to it. */
        bottom: 100%;
        left: 0;
        margin-bottom: 5px;

        display: inline-block;
        font-family: var(--wordplay-app-font);
        font-size: 0.7em;
        line-height: 1;
        padding: 2px 5px;
        border: 1px solid var(--peer-color);
        /* Mirror CreatorView's chrome shape (see CreatorView.svelte)
           so the floating caret flag reads as a peer of the footer
           chip — same rounded-left vocabulary, just rendered in the
           peer's color and floated over the source. The peer's color
           shows only in the border and tail; the body uses editor-
           background and editor-foreground so the username stays
           legible against any code or theme. */
        border-radius: var(--wordplay-border-radius);
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        white-space: nowrap;
        max-width: 8em;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* When the caret is too close to the editor's top edge for the flag
       to fit above, flip it below the caret. The tail flips with it
       (see .flag-tail rule below). */
    .flip-down .flag {
        bottom: auto;
        top: 100%;
        margin-bottom: 0;
        margin-top: 5px;
    }

    /* When the caret is too close to the right edge for the flag to
       fit extending right, anchor its right edge at the caret instead
       so it grows leftward into available space. */
    .flip-left .flag {
        left: auto;
        right: 0;
    }

    /* Speech-bubble tail. Default: points down from the bottom of the
       flag toward the caret below. Triangle made with a CSS
       border-rectangle trick — three transparent borders + one colored
       border on the side that points.
       Positioned at `left: 1em` so the tail base sits past the
       rounded bottom-left corner (1em radius, see .flag above) and
       emerges from the straight portion of the edge. In flip-left
       state the flag is anchored right and the tail moves to the
       non-rounded right side at `right: 0.5em`. */
    .flag-tail {
        position: absolute;
        top: 100%;
        left: 1em;
        width: 0;
        height: 0;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-top: 5px solid var(--peer-color);
    }
    .flip-down .flag-tail {
        top: auto;
        bottom: 100%;
        border-top: none;
        border-bottom: 5px solid var(--peer-color);
    }
    .flip-left .flag-tail {
        left: auto;
        right: 0.5em;
    }

    .flag-text {
        display: inline-block;
        vertical-align: middle;
    }

    /* Range + node highlights: same geometry the local user sees for
       their own range/node selection (getRangeOutline / getOutlineOf),
       but stroked and filled in the peer's color. Below the local
       caret in z-order for the same reason as the caret line. */
    .peer-highlight {
        position: absolute;
        pointer-events: none;
        z-index: 4;
    }
    .peer-highlight path {
        stroke: var(--peer-color);
        stroke-width: var(--wordplay-focus-width);
        stroke-linejoin: round;
        fill: var(--peer-color);
        /* Translucent fill so the code underneath stays readable. The
           range highlight gets slightly more fill than the node
           highlight because a range is meant to communicate "this
           span is selected" whereas a node selection is closer to a
           framed border. */
        fill-opacity: 0.15;
    }
    .peer-highlight.node path {
        fill-opacity: 0.08;
    }
</style>
