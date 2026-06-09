<!--
  A notice shown in the editor's footer-notification band: large-deletion and drag/paste feedback, the
  checkpoint banner, and the collaborator presence bar all use it. Unlike the web-form `Notice`, it's
  rectangular (no rounded corners) so it slots into the editor's rectangular border, and it uses the
  standard editor background/foreground colors so it reads as part of the editor rather than a loud
  form warning. A top border delineates it from the code above; the interior content is arbitrary.
-->
<script lang="ts">
    import { animationDuration } from '@db/Database';
    import { type Snippet } from 'svelte';
    import { slide } from 'svelte/transition';

    interface Props {
        children: Snippet;
    }

    let { children }: Props = $props();
</script>

<div
    class="editor-notice"
    transition:slide={{ duration: $animationDuration }}
    >{@render children()}</div
>

<style>
    .editor-notice {
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
</style>
