<!--
  Footer notice that shows the current Wordplay clipboard contents (what was last copied or cut within
  the app). Renders the content as Wordplay code when it parses, otherwise as plain text, clipped to one
  short line. The close button clears Wordplay's internal clipboard (the OS clipboard is left untouched).
-->
<script lang="ts">
    import { parseClipboardCode } from '@components/editor/clipboardDisplay';
    import EditorNotice from '@components/editor/EditorNotice.svelte';
    import RootView from '@components/project/RootView.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Note from '@components/widgets/Note.svelte';
    import { blocks } from '@db/Database';

    interface Props {
        /** The clipboard text to display. */
        text: string;
        /** Dismiss the notice and clear Wordplay's clipboard. */
        dismiss: () => void;
    }

    let { text, dismiss }: Props = $props();

    let parsed = $derived(parseClipboardCode(text));

    /** The fixed-height window the content is clipped to. */
    let clip = $state<HTMLDivElement | undefined>(undefined);
    /** The content wrapper we measure (unscaled) and visually scale to fit. */
    let scaler = $state<HTMLDivElement | undefined>(undefined);
    /** Uniform scale (<= 1) that shrinks oversized clipboard content — a large
     *  pasted node — down to the clip's fixed height so it stays readable. */
    let scale = $state(1);

    // Re-fit whenever the content or window changes size. A CSS transform is
    // paint-only, so `scrollHeight` always reports the natural (unscaled) height,
    // letting us derive the scale without toggling the transform off first.
    $effect(() => {
        const clipEl = clip;
        const scalerEl = scaler;
        if (clipEl === undefined || scalerEl === undefined) return;
        const fit = () => {
            const available = clipEl.clientHeight;
            const natural = scalerEl.scrollHeight;
            scale = natural > available && natural > 0 ? available / natural : 1;
        };
        fit();
        const observer = new ResizeObserver(fit);
        observer.observe(scalerEl);
        observer.observe(clipEl);
        return () => observer.disconnect();
    });
</script>

<EditorNotice {dismiss}>
    <div class="clipboard">
        <Note inline
            ><LocalizedText path={(l) => l.ui.source.clipboard.label} /></Note
        >
        <div class="clip" bind:this={clip}>
            <div
                class="scaler"
                bind:this={scaler}
                style:transform="scale({scale})"
            >
                {#if parsed.isCode}
                    <RootView
                        node={parsed.source}
                        spaces={parsed.source.spaces}
                        blocks={$blocks}
                        inline
                        inert
                        editable={false}
                    />
                {:else}{text}{/if}
            </div>
        </div>
    </div>
</EditorNotice>

<style>
    .clipboard {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        min-width: 0;
    }

    /* The fixed-height window the content is clipped and scaled to fit. */
    .clip {
        flex: 1;
        min-width: 0;
        height: 2em;
        overflow: hidden;
    }

    /* Scaled from the top-left so the shrunk content stays anchored to the start
       of the clip window rather than drifting toward its center. */
    .scaler {
        width: max-content;
        transform-origin: top left;
    }
</style>
