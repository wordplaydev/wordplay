<script lang="ts">
    import StructureInputsEditor from '@components/palette/StructureInputsEditor.svelte';
    import Button from '@components/widgets/Button.svelte';
    import type Project from '@db/projects/Project';
    import OutputExpression from '@edit/output/OutputExpression';
    import getStructureProperties from '@edit/output/getStructureProperties';
    import Evaluate from '@nodes/Evaluate';
    import NumberLiteral from '@nodes/NumberLiteral';
    import Unit from '@nodes/Unit';
    import { Projects, locales } from '@db/Database';

    interface Props {
        project: Project;
        place: Evaluate;
        editable: boolean;
        convertable: boolean;
        id?: string | undefined;
    }

    let {
        project,
        place,
        editable,
        convertable,
        id = undefined,
    }: Props = $props();

    let outputs = $derived([new OutputExpression(project, place, $locales)]);
    let properties = $derived(getStructureProperties(project, $locales, place));
</script>

<div class="place" {id}>
    {project.shares.output.Place.names.getSymbolicName()}
    <StructureInputsEditor {project} {outputs} {properties} {editable} />
    {#if convertable}
        <Button
            tip={(l) => l.ui.palette.button.addMotion}
            active={editable}
            action={() => {
                Projects.revise(project, [
                    [
                        place,
                        Evaluate.make(
                            project.shares.input.Motion.getReference($locales),
                            [
                                place,
                                Evaluate.make(
                                    project.shares.output.Velocity.getReference(
                                        $locales,
                                    ),
                                    [
                                        NumberLiteral.make(
                                            0,
                                            Unit.create(['m'], ['s']),
                                        ),
                                        NumberLiteral.make(
                                            0,
                                            Unit.create(['m'], ['s']),
                                        ),
                                        NumberLiteral.make(
                                            0,
                                            Unit.create(['°'], ['s']),
                                        ),
                                    ],
                                ),
                            ],
                        ),
                    ],
                ]);
            }}
            icon="→">{project.shares.input.Motion.getNames()[0]}</Button
        >
        <Button
            tip={(l) => l.ui.palette.button.addPlacement}
            active={editable}
            action={() => {
                Projects.revise(project, [
                    [
                        place,
                        Evaluate.make(
                            project.shares.input.Placement.getReference(
                                $locales,
                            ),
                            [place],
                        ),
                    ],
                ]);
            }}
            icon="→">{project.shares.input.Placement.getNames()[0]}</Button
        >
    {/if}
</div>

<style>
    .place {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        align-items: start;
        width: 100%;
    }
</style>
