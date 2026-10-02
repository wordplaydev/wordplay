<!--
    Reads a bubble's text aloud, highlighting each word as it is spoken, for
    anyone who would rather listen than read and doesn't use a screen reader
    (#1015). The reading itself is loaded only when this mounts, off the page's
    static import graph.
-->
<script module lang="ts">
    type Reader = typeof import('@components/speech/readAloud');
    let loading: Promise<Reader> | undefined = undefined;
    let loaded: Reader | undefined = undefined;
    /** Loads the reader once for every button on the page. */
    export function loadReader(): Promise<Reader> {
        loading ??= import('@components/speech/readAloud').then((module) => {
            loaded = module;
            return module;
        });
        return loading;
    }
</script>

<script lang="ts">
    import Toggle from '@components/widgets/Toggle.svelte';
    import { locales, readAloudRate, voice } from '@db/Database';
    import { onMount } from 'svelte';

    interface Props {
        /** The content to read. */
        content: HTMLElement | undefined;
    }

    let { content }: Props = $props();

    let supported = $state(false);
    let beingRead = $state<readonly Element[]>([]);
    /** On whenever this content is being read, however that reading began. */
    let reading = $derived(
        content !== undefined && beingRead.some((root) => root === content),
    );

    onMount(() => {
        let unsubscribe: (() => void) | undefined = undefined;
        loadReader().then((reader) => {
            supported = reader.canRead();
            unsubscribe = reader.nowReading.subscribe(
                (roots) => (beingRead = roots),
            );
        });
        return () => {
            unsubscribe?.();
            // Text that is gone can't be read along with.
            if (reading) loaded?.stop();
        };
    });

    function toggle() {
        // Synchronous when loaded, which it will be by the time anyone can
        // press this: iOS only speaks when asked inside the gesture itself.
        const reader = loaded;
        if (reader === undefined || content === undefined) return;
        if (reading) {
            reader.stop();
            return;
        }
        reader.prime();
        reader.read([content], {
            keywords: $locales.getLocale().keyword,
            names: $locales.getLocale().token,
            rate: $readAloudRate,
            voice: $voice ?? undefined,
        });
    }
</script>

{#if supported}
    <Toggle tips={(l) => l.ui.widget.readAloud} on={reading} {toggle}
        >{reading ? '■' : '🔊'}</Toggle
    >
{/if}
