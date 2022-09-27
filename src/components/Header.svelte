<script lang="ts">
    import { examples } from '../examples/examples';
    import { updateProject } from '../models/stores';
    import Project from '../models/Project';
    import Source from '../models/Source';

    let example: string;

    function handleChange() {
        updateProject(new Project(example, new Source("start", examples[example], "play"), []));
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