<script lang="ts">
    import Evaluate from '../../nodes/Evaluate';
    import type Project from '@models/Project';
    import PlaceEditor from './PlaceEditor.svelte';
    import VelocityEditor from './VelocityEditor.svelte';

    export let project: Project;
    export let motion: Evaluate;
    export let editable: boolean;

    $: place = motion.getInput(
        project.shares.input.Motion.inputs[0],
        project.getNodeContext(motion)
    );
    $: velocity = motion.getInput(
        project.shares.input.Motion.inputs[1],
        project.getNodeContext(motion)
    );
</script>

<div class="motion">
    {project.shares.input.Motion.names.getPreferredNameString([], true)}
    {#if place instanceof Evaluate}
        <div class="field"
            ><PlaceEditor {project} {place} {editable} convertable={false} />
        </div>
    {/if}
    {#if velocity instanceof Evaluate}
        <div class="field"
            ><VelocityEditor {project} {velocity} {editable} />
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
        font-family: var(--wordplay-code-font);
        width: 100%;
    }
</style>
