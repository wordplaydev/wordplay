<!-- A kit's newest published source, highlighted and read-only (#8).

     Both moderation queues need it — one to decide a listing, one to answer a report —
     and a decision about code is made by reading it, so it is rendered through `RootView`
     rather than as a wall of monospace. -->
<script lang="ts">
    import Spinning from '@components/app/Spinning.svelte';
    import RootView from '@components/project/RootView.svelte';
    import { DB } from '@db/Database';
    import type { SerializedKit } from '@db/kits/Kit';
    import Source from '@nodes/Source';

    interface Props {
        kit: SerializedKit;
        /** How tall the scroller may grow before it scrolls instead. */
        height?: string;
    }

    let { kit, height = '30em' }: Props = $props();

    let source = $state<Source | undefined>(undefined);
    $effect(() => {
        const { id, latest } = kit;
        let cancelled = false;
        source = undefined;
        DB.loadKits()
            .then((kits) => kits.getVersion(id, latest))
            .then((version) => {
                if (!cancelled && version)
                    source = new Source(version.sourceName, version.code);
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    });
</script>

{#if source}
    <div class="code" style:max-height={height}>
        <RootView
            node={source}
            spaces={source.spaces}
            blocks={false}
            inert
            wrap
            editable={false}
        />
    </div>
{:else}
    <Spinning />
{/if}

<style>
    .code {
        overflow: auto;
        padding: var(--wordplay-spacing);
        border: solid var(--wordplay-border-width) var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
    }
</style>
