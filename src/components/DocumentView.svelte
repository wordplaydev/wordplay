<!-- A window in a window manager that displays a document -->
<script lang="ts">
    import Document from '../models/Document';
    import { project } from '../models/stores';

    export let doc: Document;
    $: content = doc.getContent();        

    function handleEdit(event: Event) {
        if($project !== undefined) {
            const newDoc = new Document(doc.getName(), (event.target as HTMLTextAreaElement).value);
            project.set($project.withRevisedDocument(doc, newDoc));
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
        display: flex;
        flex-direction: column;
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
        min-height: 20rem;
        background: var(--wordplay-background);
        padding: var(--wordplay-spacing);
        color: var(--wordplay-foreground);
    }

    textarea:focus {
        outline: var(--wordplay-border-width) solid var(--wordplay-highlight)
    }

    textarea[readonly] {
        background: var(--wordplay-chrome);
    }
</style>