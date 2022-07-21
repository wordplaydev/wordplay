<!-- A window in a window manager that displays a document -->
<script lang="ts">
import Project from '../models/Project';

    import { project } from '../models/stores';
    import type Document from "../models/Document";

    export let doc: Document;
    $: content = doc.getContent(); 

    function handleEdit(event: Event) {
        // When the document changes, create a new document with the new value and update the project,
        // triggering a rerender.
        if($project !== undefined) {
            const newCode = (event.target as HTMLTextAreaElement).value;
            // Clean up the project before we create a new one.
            $project.cleanup();
            // Make a new one based on the new program
            project.set(new Project("Play", newCode, () => project.set($project)));
        }
    }

</script>

<div class="document">
    <div class="document-title">{doc.getName()}</div>
    <textarea 
        on:input={handleEdit} 
        class="document-content" 
        bind:value={content} 
        readonly={!doc.isEditable()}
        style="height: {doc.getContent().split("\n").length}em;"
        tabIndex=0
    />
</div>

<style>
    .document {
        min-width: 20em;
        display: flex;
        flex-flow: column wrap;
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
        width: auto;
        min-height: 10rem;
        background: var(--wordplay-background);
        padding: var(--wordplay-spacing);
        color: var(--wordplay-foreground);
    }

    textarea:focus {
        outline: var(--wordplay-border-width) solid var(--wordplay-highlight)
    }

    textarea[readonly] {
        background: var(--wordplay-chrome);
        tab-size : 2;
    }
</style>