<script lang="ts">
    import { setContext } from 'svelte';
    import {
        type ProjectContext,
        type SelectedOutputContext,
        type SelectedPhraseContext,
        type PlayingContext,
        type CurrentStepContext,
        type CurrentStepIndexContext,
        type StreamChangesContext,
        type AnimatingNodesContext,
        type ConflictsContext,
        PlayingSymbol,
        ProjectSymbol,
        SelectedOutputSymbol,
        SelectedPhraseSymbol,
        CurrentStepSymbol,
        CurrentStepIndexSymbol,
        AnimatingNodesSymbol,
        ConflictsSymbol,
        StreamChangesSymbol,
    } from '@components/project/Contexts';
    import { writable, type Writable } from 'svelte/store';
    import type Evaluate from '@nodes/Evaluate';
    import type { SelectedPhraseType } from '@components/project/project';
    import type Step from '@runtime/Step';
    import type { StreamChange } from '@runtime/Evaluator';
    import type Node from '@nodes/Node';
    import { page } from '$app/stores';
    import { examples, makeProject } from '../../../examples/examples';
    import ProjectView from '@components/project/ProjectView.svelte';
    import type Project from '@models/Project';

    const project: Writable<Project | undefined> = writable<
        Project | undefined
    >();

    /** The current index of the current project's step **/
    const currentStepIndex = writable<number>(0);

    /** The list of stream changes in the current project's evalutor. **/
    const streams: StreamChangesContext = writable<StreamChange[]>([]);

    /** The animations active in the current project's evaluator. **/
    const animatingNodes: AnimatingNodesContext = writable<Set<Node>>(
        new Set()
    );

    /** The conflicts present in the current project. **/
    const conflicts: ConflictsContext = writable([]);

    /**
     * Create a project global context that stores the current selected value (and if not in an editing mode, nothing).
     * This enables output views like phrases and groups know what mode the output view is in and whether they are selected.
     * so they can render selected feedback.
     */
    const selectedOutput = writable<Evaluate[]>([]);
    const selectedPhrase = writable<SelectedPhraseType>(null);

    /** Whether the current project's evaluator is playing. */
    const playing = writable<boolean>(true);

    /** The project's current step being evaluated if stepping */
    const currentStep: Writable<Step | undefined> = writable<Step | undefined>(
        undefined
    );

    setContext<ProjectContext>(ProjectSymbol, project);
    setContext<CurrentStepIndexContext>(
        CurrentStepIndexSymbol,
        currentStepIndex
    );
    setContext<AnimatingNodesContext>(AnimatingNodesSymbol, animatingNodes);
    setContext<SelectedOutputContext>(SelectedOutputSymbol, selectedOutput);
    setContext<SelectedPhraseContext>(SelectedPhraseSymbol, selectedPhrase);
    setContext<PlayingContext>(PlayingSymbol, playing);
    setContext<CurrentStepContext>(CurrentStepSymbol, currentStep);
    setContext<ConflictsContext>(ConflictsSymbol, conflicts);
    setContext<StreamChangesContext>(StreamChangesSymbol, streams);

    // Clear the selected output upon playing.
    playing.subscribe((val) => {
        if (val) selectedOutput.set([]);
    });

    // When the project, changes, observe it.
    project.subscribe((newProject) => {
        if (newProject) {
            // Have the new evaluator broadcast to this.
            newProject.evaluator.observe(() =>
                updateEvaluatorStores(newProject)
            );
        }
    });

    function updateEvaluatorStores(project: Project) {
        const evaluator = project.evaluator;
        currentStep.set(evaluator.getCurrentStep());
        currentStepIndex.set(evaluator.getStepIndex());
        playing.set(evaluator.isPlaying());
        streams.set(evaluator.reactions);
    }

    $: {
        const projectID = $page.params.projectid;
        const example = examples.find((example) => example.name === projectID);
        project.set(example ? makeProject(example) : undefined);
    }
</script>

{#if $project}
    <ProjectView project={$project} />
{/if}
