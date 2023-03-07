<script lang="ts">
    import {
        type ProjectContext,
        type SelectedOutputPathsContext,
        type SelectedPhraseContext,
        type PlayingContext,
        type CurrentStepContext,
        type CurrentStepIndexContext,
        type StreamChangesContext,
        type AnimatingNodesContext,
        type ConflictsContext,
        PlayingSymbol,
        ProjectSymbol,
        SelectedOutputPathsSymbol,
        SelectedPhraseSymbol,
        CurrentStepSymbol,
        CurrentStepIndexSymbol,
        AnimatingNodesSymbol,
        ConflictsSymbol,
        StreamChangesSymbol,
        getProjects,
        type SelectedOutputContext,
        SelectedOutputSymbol,
        EvaluatorSymbol,
        type EvaluatorContext,
    } from '@components/project/Contexts';
    import {
        derived,
        writable,
        type Readable,
        type Writable,
    } from 'svelte/store';
    import Evaluate from '@nodes/Evaluate';
    import type Step from '@runtime/Step';
    import type { StreamChange } from '@runtime/Evaluator';
    import type Node from '@nodes/Node';
    import { page } from '$app/stores';
    import ProjectView from '@components/project/ProjectView.svelte';
    import type Project from '@models/Project';
    import { preferredTranslations } from '@translation/translations';
    import Feedback from '@components/app/Feedback.svelte';
    import Loading from '@components/app/Loading.svelte';
    import Evaluator from '@runtime/Evaluator';
    import { onDestroy, setContext } from 'svelte';

    const projects = getProjects();

    /** True if we're async loading the project, as opposed to getting it from the browser cache. */
    let loading: boolean = false;

    /** The project store is derived from the projects and the page's project ID. */
    const project: Readable<Project | undefined> = derived(
        [page, projects],
        ([$page, $projects]) => {
            const projectID = $page.params.projectid;
            const project = $projects.get(projectID);
            if (projectID === undefined) return undefined;
            else if (
                project === undefined &&
                projectID &&
                projectID.length > 0
            ) {
                loading = true;
                $projects.load(projectID);
            } else return project;
        }
    );

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
    const selectedOutputPaths: SelectedOutputPathsContext = writable([]);
    const selectedOutput = derived(
        [project, selectedOutputPaths],
        ([proj, paths]) => {
            return paths
                .map(({ source, path }) => {
                    if (
                        source === undefined ||
                        path === undefined ||
                        proj === undefined
                    )
                        return undefined;
                    const name = source.getNames()[0];
                    if (name === undefined) return undefined;
                    const newSource = proj.getSourceWithName(name);
                    if (newSource === undefined) return undefined;
                    return newSource.tree.resolvePath(path);
                })
                .filter(
                    (output): output is Evaluate => output instanceof Evaluate
                );
        }
    );
    const selectedPhrase: SelectedPhraseContext = writable(null);

    /** Whether the current project's evaluator is playing. */
    const playing = writable<boolean>(true);

    /** The project's current step being evaluated if stepping */
    const currentStep: Writable<Step | undefined> = writable<Step | undefined>(
        undefined
    );

    /** A store holding the evaluator corresponding to the current project */
    const evaluator: Writable<Evaluator | undefined> = writable(undefined);

    setContext<ProjectContext>(ProjectSymbol, project);
    setContext<EvaluatorContext>(EvaluatorSymbol, evaluator);

    setContext<CurrentStepIndexContext>(
        CurrentStepIndexSymbol,
        currentStepIndex
    );
    setContext<AnimatingNodesContext>(AnimatingNodesSymbol, animatingNodes);
    setContext<SelectedOutputPathsContext>(
        SelectedOutputPathsSymbol,
        selectedOutputPaths
    );
    setContext<SelectedOutputContext>(SelectedOutputSymbol, selectedOutput);
    setContext<SelectedPhraseContext>(SelectedPhraseSymbol, selectedPhrase);
    setContext<PlayingContext>(PlayingSymbol, playing);
    setContext<CurrentStepContext>(CurrentStepSymbol, currentStep);
    setContext<ConflictsContext>(ConflictsSymbol, conflicts);
    setContext<StreamChangesContext>(StreamChangesSymbol, streams);

    // Clear the selected output upon playing.
    playing.subscribe((val) => {
        if (val) selectedOutputPaths.set([]);
    });

    // When the project changes, create a new evaluator, observe it.
    project.subscribe((newProject) => {
        if (newProject) {
            // Make the new evaluator
            const newEvaluator = new Evaluator(newProject, $evaluator);

            // Listen to the evaluator changes to update evaluator-related stores.
            newEvaluator.observe(() => {
                currentStep.set(newEvaluator.getCurrentStep());
                currentStepIndex.set(newEvaluator.getStepIndex());
                playing.set(newEvaluator.isPlaying());
                streams.set(newEvaluator.reactions);
            });

            // Stop the old evaluator.
            if ($evaluator) $evaluator.stop();

            // Set the evaluator store
            evaluator.set(newEvaluator);
        }
    });

    /** Clean up the evaluator when leaving this page. */
    onDestroy(() => {
        $evaluator?.stop();
        evaluator.set(undefined);
        streams.set([]);
    });
</script>

{#if $project && $evaluator}
    <ProjectView project={$project} evaluator={$evaluator} />
{:else if loading}
    <Loading />
{:else if $page.params.projectid}
    <Feedback>{$preferredTranslations[0].ui.feedback.unknownProject}</Feedback>
{/if}
