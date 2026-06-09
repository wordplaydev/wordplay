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
</script>

<EditorNotice {dismiss}>
    <div class="clipboard">
        <Note inline
            ><LocalizedText path={(l) => l.ui.source.clipboard.label} /></Note
        >
        <div class="content">
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
</EditorNotice>

<style>
    .clipboard {
        display: flex;
        flex-direction: row;
        align-items: baseline;
        gap: var(--wordplay-spacing);
        /* Clip the line */
        max-height: 3em;
        /* overflow-y: hidden; */
    }

    .content {
        min-width: 0;
    }
</style>
