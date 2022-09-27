<script lang="ts">
    import { examples } from '../examples/examples';
    import { updateProject } from '../models/stores';
    import type Project from '../models/Project';

    let example: Project;

    function handleChange() {
        updateProject(example);
    }

</script>

<div>
    Wordplay
    <select bind:value={example} on:change={handleChange}>
        {#each examples as example }
            <option value={example}>{example.getName()}</option>
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