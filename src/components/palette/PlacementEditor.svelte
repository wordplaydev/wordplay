<script lang="ts">
    import Evaluate from '../../nodes/Evaluate';
    import type Project from '@models/Project';
    import PlaceEditor from './PlaceEditor.svelte';

    export let project: Project;
    export let placement: Evaluate;
    export let editable: boolean;

    $: place = placement.getInput(
        project.shares.input.Placement.inputs[0],
        project.getNodeContext(placement)
    );
</script>

<div class="motion">
    {project.shares.input.Placement.names.getPreferredNameString([], true)}
    {#if place instanceof Evaluate}
        <div class="field"
            ><PlaceEditor {project} {place} {editable} convertable={false} />
        </div>
    {/if}
</div>

<style>
    .motion {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }
    .field {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        width: 100%;
    }
</style>
