<script lang="ts">
    import type PatternValue from '@values/PatternValue';

    /**
     * The view for a {@link PatternValue} — a compiled pattern. It renders the
     * pattern as the creator wrote it (e.g. `⣿>0 #⣿`) in the code font, rather
     * than falling through to the generic UnknownView (which just shows the class
     * name on an error background). The live match *state* is a separate value
     * (see PatternMatchView); a PatternValue is the pattern itself.
     */
    interface Props {
        value: PatternValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();

    let source = $derived(value.toWordplay());
</script>

<span class="pattern" class:inline>{source}</span>

<style>
    .pattern {
        font-family: var(--wordplay-code-font);
        padding: 0 0.25em;
        border-radius: var(--wordplay-border-radius);
        background: var(--wordplay-alternating-color);
        white-space: pre;
    }
</style>
