<script lang="ts">
    import Project from '../models/Project';
    import { examples } from '../examples/examples';
    import { project } from '../models/stores';

    let example: string;

    function handleChange() {
        project.set(new Project("Play", examples[example], () => project.set($project)));
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