<!--
  A notice shown in the editor's footer-notification band: large-deletion and drag/paste feedback, the
  checkpoint banner, the collaborator presence bar, and the clipboard notice all use it. Unlike the
  web-form `Notice`, it's rectangular (no rounded corners) so it slots into the editor's rectangular
  border, and it uses the standard editor background/foreground colors so it reads as part of the editor
  rather than a loud form warning. A top border delineates it from the code above; the interior content
  is arbitrary. When `dismiss` is provided, a close button is pinned to the inline-end.
-->
<script lang="ts">
    import Button from '@components/widgets/Button.svelte';
    import { animationDuration } from '@db/Database';
    import { type Snippet } from 'svelte';
    import { slide } from 'svelte/transition';

    interface Props {
        children: Snippet;
        /** When provided, a close button is shown at the inline-end that calls this to dismiss the notice. */
        dismiss?: (() => void) | undefined;
    }

    let { children, dismiss = undefined }: Props = $props();
</script>

<div
    class="editor-notice"
    transition:slide={{ duration: $animationDuration }}
>
    <div class="content">{@render children()}</div>
    {#if dismiss}<div class="dismiss">
            <Button
                tip={(l) => l.ui.source.notice.dismiss}
                action={dismiss}
                icon="✕"
            />
        </div>{/if}
</div>

<style>
    .editor-notice {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        width: 100%;
        padding: var(--wordplay-spacing);
        /* Standard editor colors so notices read as part of the editor, not a colored form warning. */
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        /* Rectangular — no border-radius — to slot into the editor's border. The top border delineates
           the notice from the code above; stacked notices read as one integrated panel. */
        border-top: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
    }

    .content {
        flex: 1;
        min-width: 0;
    }

    /* Only the close button opts back into pointer events; the band itself stays click-through so drops
       still land at the bottom of the editor. */
    .dismiss {
        flex-shrink: 0;
        pointer-events: auto;
    }
</style>
