<script lang="ts">
    import { DecrementLiteral, IncrementLiteral } from './util/Commands';
    import CommandButton from '../widgets/CommandButton.svelte';

    export let sourceID: string;
    export let bounds: { left: number; top: number } | undefined;
</script>

<div
    class="adjust"
    style:left={bounds ? `${bounds.left}px` : null}
    style:top={bounds ? `${bounds.top}px` : null}
>
    <CommandButton command={IncrementLiteral} {sourceID} />
    <CommandButton command={DecrementLiteral} {sourceID} />
</div>

<style>
    .adjust {
        position: absolute;
        display: inline-flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        margin-inline-start: var(--wordplay-spacing);
        margin-block-start: calc(var(--wordplay-spacing) / 2);
    }

    .adjust :global(button) {
        display: inline-block;
        line-height: 0%;
        height: 0.25em;
    }
</style>
