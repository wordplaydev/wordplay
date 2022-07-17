<script>

    import Project from '../models/Project';
    import Document from '../models/Document';
    import { project } from '../models/stores';
    import { parse } from '../parser/Parser';
    import { tokenize } from '../parser/Tokenizer'

    import Manager from '../components/Manager.svelte';
    import Evaluator from '../runtime/Evaluator';
    import Shares from '../runtime/Shares';

    const code = new Document("code", "" );
    const tokens = new Document("tokens", code, doc => tokenize(doc.getContent()).map(t => t.toString()).join("\n"));
    const tree = new Document("ast", code, doc => parse(doc.getContent()).toString());
    const conflicts = new Document("conflicts", code, doc => { 
        const program = parse(doc.getContent());
        return program.getAllConflicts(program).join("\n");
    });
    const steps = new Document("steps", code, doc => { 
        return parse(doc.getContent()).compile().map(s => s.toString()).join("\n");
    });
    const output = new Document("output", code, doc => {
        const evaluator = new Evaluator(parse(doc.getContent()), new Shares());
        return `${evaluator.evaluate()}`;
    });

    project.set(new Project("Play", [
        code,
        tokens,
        tree,
        conflicts,
        steps,
        output
    ]));

</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com">
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,500;0,700;1,500;1,700&display=swap" rel="stylesheet">
</svelte:head>

<Manager/>

<style>
    :global(body) {
        background-color: var(--wordplay-background);
        padding: 0;
        margin: 0;
        font-family: var(--wordplay-font-face);
        font-weight: var(--wordplay-font-weight);
        color: var(--wordplay-foreground);
    }

    :global(:root){
        --wordplay-foreground: black; 
        --wordplay-background: white;
        --wordplay-chrome: rgb(240,240,240);
        --wordplay-border-color: rgb(230,230,230);
        --wordplay-highlight: rgb(237, 206, 53);
        --wordplay-spacing: 0.5em;
        --wordplay-font-face: "Noto Sans", sans-serif;
        --wordplay-font-weight: 500;
        --wordplay-border-width: 4px;
        --wordplay-border-radius: 6px;
    }

    :global(textarea) {
        border: none;
        resize: none;
    }
</style>