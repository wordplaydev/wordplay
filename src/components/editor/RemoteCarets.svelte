<!--
  Row of collaborator chips shown in the editor footer when other people
  are editing this project. Each peer is rendered with the same
  CreatorView the rest of the app uses (character + username + chrome
  border), tinted in the peer's deterministic Basic-Color so the chip
  matches the floating caret line painted by RemoteCaretOverlay.

  Anonymous viewers never appear here — they don't publish presence (see
  PresenceTracker.publishNow). When the local user is currently waiting
  for a concurrent-editing slot (cap reached), a localized "waiting for
  a slot" notice replaces the chips.
-->
<script lang="ts">
    import CreatorView from '@components/app/CreatorView.svelte';
    import EditorNotice from '@components/editor/EditorNotice.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { getAnnouncer } from '@components/project/Contexts';
    import { Creators, locales, Projects } from '@db/Database';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import {
        assignDistinctColors,
        isPresenceStale,
    } from '@db/projects/ProjectPresence';
    import type { BCTKey } from '@output/BasicColors';
    import { Focals } from '@output/BasicColors';
    import { onDestroy, untrack } from 'svelte';

    interface Props {
        projectID: string;
    }

    let { projectID }: Props = $props();

    let tracker = $derived(Projects.getPresenceTracker(projectID));

    // Wake the staleness filter every 5s.
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

    // Locally derive a unique color per peer. Include the local
    // clientID in the input so the local user's color (the one others
    // see on us) doesn't accidentally collide with any visible peer.
    // Every viewer that sees the same peer set arrives at the same
    // assignment, so a given peer reads as the same color in every
    // tab — see assignDistinctColors's docs.
    let colorByClient: Map<string, BCTKey> = $derived.by(() => {
        if (tracker === undefined) return new Map();
        return assignDistinctColors([
            tracker.clientID,
            ...peers.map((p) => p.clientID),
        ]);
    });

    // Resolve userID → Creator. Async, cached in this local map; misses are
    // fetched on demand. Anonymous peers (null userID) are skipped.
    let creators: Record<string, Creator | null> = $state({});
    $effect(() => {
        const missing: string[] = [];
        for (const p of peers) {
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

    // Announce join/leave to the screen-reader live region via the
    // centralized Announcer. We track the set of peer client IDs we've
    // already announced as present and diff against it on each peers update.
    const announce = getAnnouncer();
    let knownPeers: Set<string> = new Set();
    $effect(() => {
        if (announce === undefined) return;
        const fn = $announce;
        if (fn === undefined) return;
        const current = new Set(peers.map((p) => p.clientID));
        const prev = untrack(() => knownPeers);
        const language = $locales.getLanguages()[0];
        for (const peer of peers) {
            if (prev.has(peer.clientID)) continue;
            const message = $locales
                .concretize(
                    (l) => l.ui.presence.joined,
                    { name: nameFor(peer.userID) },
                )
                .toText();
            fn('collaborator', language, message);
        }
        for (const id of prev) {
            if (current.has(id)) continue;
            const message = $locales
                .concretize(
                    (l) => l.ui.presence.left,
                    { name: shortFor(id) },
                )
                .toText();
            fn('collaborator', language, message);
        }
        knownPeers = current;
    });

    function nameFor(userID: string | null): string {
        if (userID === null) return '';
        const c = creators[userID];
        return c?.getUsername(false) ?? c?.getName() ?? userID.slice(0, 6);
    }
    function shortFor(clientID: string): string {
        return clientID.slice(0, 6);
    }

    function cssColor(bct: string): string {
        const f = Focals[bct as keyof typeof Focals];
        if (f === undefined) return 'currentColor';
        return `oklch(${f.l} ${f.c / 100} ${f.h})`;
    }
</script>

{#if tracker?.isAtCap}
    <!-- The "waiting for a slot" message shares the editor's notice motif so the presence bar reads as
         part of the editor footer band, not a separate web-form warning. -->
    <EditorNotice
        ><LocalizedText path={(l) => l.ui.presence.waitingForSlot} /></EditorNotice
    >
{:else if peers.length > 0}
    <EditorNotice>
        <ul
            class="remote-carets"
            aria-label={$locales.getPlainText((l) => l.ui.presence.peersLabel)}
        >
            {#each peers as peer (peer.clientID)}
                <li
                    class="peer"
                    style:--peer-color={cssColor(
                        colorByClient.get(peer.clientID) ?? peer.color,
                    )}
                    title={nameFor(peer.userID)}
                >
                    <CreatorView
                        creator={peer.userID === null
                            ? null
                            : (creators[peer.userID] ?? null)}
                        anonymize={false}
                        chrome={true}
                    />
                </li>
            {/each}
        </ul>
    </EditorNotice>
{/if}

<style>
    /* Chrome (border-top, padding, background) comes from the EditorNotice wrapper; the list only lays
       out the chips. */
    .remote-carets {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        list-style: none;
        margin: 0;
        padding: 0;
        font-size: var(--wordplay-small-font-size);
    }

    /* Tint the chip's chrome border to match the floating caret color.
       :global is needed because the .creator.chrome class is owned by
       CreatorView; scoped Svelte styles can't reach it otherwise. */
    .peer :global(.creator.chrome) {
        border-color: var(--peer-color);
    }
</style>
