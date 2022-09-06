<script lang="ts">
    import Project from '../models/Project';
    import { examples } from '../examples/examples';
    import { caret, project } from '../models/stores';
    import Caret from '../models/Caret';

    let example: string;

    function handleChange() {
        if($project) {
            const newProject = $project.withCode(examples[example]);
            project.set(newProject);
            caret.set(new Caret(newProject, 0));
        }
    }

</script>

<div>
    Wordplay
    <select bind:value={example} on:change={handleChange}>
        {#each Object.keys(examples) as example }
            <option>{example}</option>
        {/each}
    </select>
</div>

<style>
    div {
        width: 100%;
        height: auto;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        padding: var(--wordplay-spacing);
        background: var(--wordplay-chrome);
        border-bottom-left-radius: var(--wordplay-border-radius);
        border-bottom-right-radius: var(--wordplay-border-radius);
        box-sizing: border-box;
    }
</style>