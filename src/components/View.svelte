<!-- A window in a window manager that displays a document -->
<script lang="ts">
    import type Project from '../models/Project';
    import Document from '../models/Document';
    import { project } from '../models/stores';

    export let doc: Document;

    let docProj: Project | undefined;
    project.subscribe(value => {
        docProj = value;
    });

    function handleEdit(event: Event) {
        if(docProj !== undefined) {
            const newProject = docProj.withRevisedDocument(doc, new Document(doc.getName(), (event.target as HTMLTextAreaElement).value));
            if(newProject)
                project.set(newProject);
        }
    }

</script>

<div class="document">
    <div class="document-title">{doc.getName()}</div>
    <textarea 
        on:input={handleEdit} 
        class="document-content" 
        value={doc.getContent()} 
        readonly={!doc.isEditable()}
        style="height: {doc.getContent().split("\n").length}em;"></textarea>
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
    }

    .document-content {
        width: auto;
        min-height: 20rem;
        background: var(--wordplay-background);
        padding: var(--wordplay-spacing);
        color: var(--wordplay-foreground);
    }
</style>