<!-- A window manager that displays a set of windows -->
<script lang="ts">
    import View from './View.svelte';
    import Header from '../components/Header.svelte';
    import Project from '../models/Project';
    import Document from '../models/Document';
    import { project } from '../models/stores';
    import { parse, tokenize } from '../parser/Parser';

    let proj: Project | undefined;
    project.subscribe(value => {
        proj = value;
    });

    const code = new Document("code", "hi" );
    const tokens = new Document("tokens", () => tokenize(code.getContent()).join(", "));
    const tree = new Document("tree", () => parse(tokens.getContent()).toWordplay());

    project.set(new Project("Play", [
        code,
        tokens,
        tree
    ])
)

</script>

<div class="manager">
    <Header></Header>
    <div class="windows">
        {#if proj === undefined}
            <p>No project</p>
        {:else}
            {#each proj.docs as doc}
                <View doc={doc}/>
            {/each}
        {/if}
    </div>
</div>

<style>
    .manager {
        width: 100vw;
        height: 100vw;
        padding: 0;
        display: flex;
        flex-direction: column;
    }

    .windows {
        height: auto;
        padding: var(--wordplay-spacing);
        display: flex;
        flex-direction: row;
        align-items: stretch;
        justify-content: center;
        gap: var(--wordplay-spacing);
}
</style>