<script lang="ts">
    import type Conflict from "../conflicts/Conflict";
    import { languages } from "../models/languages";

    export let conflicts: Conflict[];

</script>

{#each conflicts as conflict }
    <p>{conflict.getExplanation($languages[0])}</p>
{/each}