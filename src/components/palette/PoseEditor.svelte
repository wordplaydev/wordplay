<script lang="ts">
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { Projects, locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import type OutputExpression from '@edit/output/OutputExpression';
    import getPoseProperties from '@edit/output/PoseProperties';
    import Evaluate from '@nodes/Evaluate';
    import KeyValue from '@nodes/KeyValue';
    import MapLiteral from '@nodes/MapLiteral';
    import NumberLiteral from '@nodes/NumberLiteral';
    import Reference from '@nodes/Reference';
    import Button from '@components/widgets/Button.svelte';
    import StructureInputsEditor from '@components/palette/StructureInputsEditor.svelte';

    interface Props {
        project: Project;
        // takes in a list of outputexpressions to modify
        outputs: OutputExpression[];
        sequence: boolean;
        editable: boolean;
        id?: string | undefined;
    }

    let {
        project,
        outputs,
        sequence,
        editable,
        id = undefined,
    }: Props = $props();

    let PoseProperties = $derived(getPoseProperties(project, $locales, false));

    function convert() {
        Projects.revise(
            project,
            outputs.map((output) => [
                output.node,
                Evaluate.make(
                    Reference.make(
                        $locales.getName(project.shares.output.Sequence.names),
                        project.shares.output.Sequence,
                    ),
                    [
                        // Start with two keyframes (the pose at 0% and a copy at 100%); a
                        // single-pose sequence has nothing to animate between.
                        MapLiteral.make([
                            KeyValue.make(
                                NumberLiteral.make('0%'),
                                output.node,
                            ),
                            KeyValue.make(
                                NumberLiteral.make('100%'),
                                output.node.clone(),
                            ),
                        ]),
                    ],
                ),
            ]),
        );
    }
</script>

<StructureInputsEditor
    {project}
    {outputs}
    properties={PoseProperties}
    {editable}
    {id}
>
    {#snippet children()}
        {#if !sequence && editable}
            <Button tip={(l) => l.ui.palette.button.sequence} action={convert}
                >{project.shares.output.Sequence.getNames()[0]}
                <LocalizedText
                    path={(l) => l.ui.palette.button.sequence}
                /></Button
            >
        {/if}
    {/snippet}
</StructureInputsEditor>
