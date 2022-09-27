<script lang="ts">
    import { project, updateProject } from '../models/stores';
    import type Document from "../models/Document";
    import Value from '../runtime/Value';
    import Text from '../runtime/Text';
    import Structure, { createStructure } from '../runtime/Structure';
    import Phrase from '../native/Phrase';
    import VerseView from './VerseView.svelte';
    import Measurement from '../runtime/Measurement';
    import Verse from '../native/Verse';
    import Group from '../native/Group';
    import List from '../runtime/List';
    import TextType from '../nodes/TextType';
    import StructureType from '../nodes/StructureType';
    import Program from '../nodes/Program';
    import Editor from '../editor/Editor.svelte';

    export let doc: Document;
    $: content = doc.getContent();

    let evaluator = $project?.evaluator;
    let view: Structure | undefined;
    $: {
        // If the content is a Verse, just show it as is.
        if(content instanceof Value && evaluator) {
            const contentType = content.getType();
            if(contentType instanceof StructureType && contentType.definition === Verse)
                view = content as Structure;
            else if(contentType instanceof StructureType && contentType.definition === Group) {
                view = createStructure(evaluator, Verse, { group: content });
            }
            else if(contentType instanceof StructureType && contentType.definition === Phrase) {
                view = createStructure(evaluator, Verse, { group: createStructure(evaluator, Group, { phrases: new List([content]) }) });
            }
            else if(contentType instanceof TextType) {
                view = createStructure(evaluator, Verse, 
                    {
                        group: createStructure(evaluator, Group, {
                            phrases: new List([createStructure(evaluator, Phrase, {
                                size: new Measurement(20),
                                font: new Text("Noto Sans"),
                                text: content
                            })])
                        })
                    }
                );
            }
            // Otherise, just wrap in a sentence with the content's toString() text.
            else {
                view = createStructure(evaluator, Verse, 
                    {
                        group: createStructure(evaluator, Group, {
                            phrases: new List([createStructure(evaluator, Phrase, {
                                size: new Measurement(20),
                                font: new Text("Noto Sans"),
                                text: new Text(content.toString())
                            })])
                        })
                    }
                );
            }
        }
    }

    let autoplay = true;

    function handleStep() {
        if($project)
            $project.getEvaluator().stepWithinProgram();
    }

    function playPause() {
        if($project) {
            autoplay = !autoplay;
            updateProject($project.withMode(autoplay ? "play" : "step"));
        }
    }

</script>

<div class="document">
    <div class="document-title">
        {doc.getName()}
        <small>
            <!-- If it's output, show controls -->
            {#if content instanceof Value }
                <span on:click={playPause}>{autoplay ? "⏸" : "▶️"}</span>
                <button on:click={handleStep} disabled={autoplay || $project?.getEvaluator().isDone()}>step</button>
            {/if}
        </small>
    </div>
    <div class="document-content">
        {#if view instanceof Structure}
            <VerseView verse={view} evaluator={$project?.getEvaluator()}/>
        {:else if content instanceof Program}
            <Editor program={content} />
        {:else}
            <p>No value</p>
        {/if}
    </div>
</div>

<style>
    .document {
        min-width: 40em;
        display: flex;
        flex-flow: column;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        flex: 1; /* Have each document fill an equal amount of space in the window manager */
        border-radius: var(--wordplay-border-radius);
    }

    .document-title {
        height: auto;
        background: var(--wordplay-chrome);
        padding: var(--wordplay-spacing);
        border-bottom: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }

    .document-content {
        height: 100%;
        min-height: 10rem;
        max-height: 40rem;
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        box-sizing: border-box;
        overflow: scroll;
    }

    .document-content:focus-within {
        outline: var(--wordplay-border-width) solid var(--wordplay-highlight);
    }

</style>