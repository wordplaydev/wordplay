<script lang="ts">
    import type Project from '@db/projects/Project';
    import Evaluate from '@nodes/Evaluate';
    import PlaceEditor from '@components/palette/PlaceEditor.svelte';
    import VelocityEditor from '@components/palette/VelocityEditor.svelte';
    import { must } from '@util/nullable';

    interface Props {
        project: Project;
        motion: Evaluate;
        editable: boolean;
        id?: string | undefined;
    }

    let { project, motion, editable, id = undefined }: Props = $props();

    let place = $derived(
        motion.getInput(
            // The basis declares Motion's place and velocity inputs.
            must(project.shares.input.Motion.inputs[0], "Motion's place"),
            project.getNodeContext(motion),
        ),
    );
    let velocity = $derived(
        motion.getInput(
            must(project.shares.input.Motion.inputs[1], "Motion's velocity"),
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
