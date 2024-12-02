<script lang="ts">
    import Evaluate from '../../nodes/Evaluate';
    import type Project from '@models/Project';
    import PlaceEditor from './PlaceEditor.svelte';
    import VelocityEditor from './VelocityEditor.svelte';

    interface Props {
        project: Project;
        motion: Evaluate;
        editable: boolean;
        id?: string | undefined;
    }

    let { project, motion, editable, id = undefined }: Props = $props();

    let place = $derived(
        motion.getInput(
            project.shares.input.Motion.inputs[0],
            project.getNodeContext(motion),
        ),
    );
    let velocity = $derived(
        motion.getInput(
            project.shares.input.Motion.inputs[1],
            project.getNodeContext(motion),
        ),
    );
</script>

<div class="motion" {id}>
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
