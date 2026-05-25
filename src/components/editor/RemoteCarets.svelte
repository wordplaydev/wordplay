<!--
  Row of collaborator chips shown in the editor footer when more than one
  person can edit this project. Each peer is rendered with CreatorView so
  the chip matches how creators appear elsewhere in the app (character +
  username), tinted with the peer's deterministic Basic-Color so they can
  be matched to the floating caret line painted by RemoteCaretOverlay.

  Anonymous viewers never appear here — they don't publish presence (see
  PresenceTracker.publishNow). When the local user is currently waiting
  for a concurrent-editing slot (cap reached), a small notice replaces
  the chips with a localized "waiting for a slot" message.
-->
<script lang="ts">
    import CreatorView from '@components/app/CreatorView.svelte';
    import { getAnnouncer } from '@components/project/Contexts';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { Creators, locales, Projects } from '@db/Database';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import { isPresenceStale } from '@db/projects/ProjectPresence';
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
            // Merge into the reactive map; preserve prior entries so
            // peers we've already resolved don't flicker.
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
            const name = nameFor(peer.userID);
            const template = $locales.getPlainText(
                (l) => l.ui.presence.joined,
            );
            fn('collaborator', language, template.replace('$1', name));
        }
        for (const id of prev) {
            if (current.has(id)) continue;
            const template = $locales.getPlainText((l) => l.ui.presence.left);
            fn('collaborator', language, template.replace('$1', shortFor(id)));
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
    <div class="remote-carets waiting" role="status">
        <LocalizedText path={(l) => l.ui.presence.waitingForSlot} />
    </div>
{:else if peers.length > 0}
    <ul
        class="remote-carets"
        aria-label={$locales.getPlainText(
            (l) => l.ui.presence.peersLabel,
        )}
    >
        {#each peers as peer (peer.clientID)}
            <li
                class="peer"
                style:--peer-color={cssColor(peer.color)}
                title={peer.userID ?? peer.clientID.slice(0, 6)}
            >
                <span class="swatch" aria-hidden="true"></span>
                <CreatorView
                    creator={peer.userID === null
                        ? null
                        : (creators[peer.userID] ?? null)}
                    anonymize={false}
                    chrome={false}
                />
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
        padding: calc(var(--wordplay-spacing) / 2)
            var(--wordplay-spacing);
        font-size: var(--wordplay-small-font-size);
    }

    .remote-carets.waiting {
        color: var(--wordplay-inactive-color);
        font-style: italic;
    }

    .peer {
        display: inline-flex;
        align-items: center;
        gap: calc(var(--wordplay-spacing) / 2);
        padding: 0 calc(var(--wordplay-spacing) / 2);
        border-radius: var(--wordplay-border-radius);
        border: 1px solid var(--peer-color);
    }

    .swatch {
        display: inline-block;
        width: 0.55em;
        height: 0.55em;
        border-radius: 50%;
        background: var(--peer-color);
        flex: 0 0 auto;
    }
</style>
