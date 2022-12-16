<script lang="ts">
    import type Conflict from "../conflicts/Conflict";
    import { languages } from "../models/languages";
    import type Context from "../nodes/Context";

    export let context: Context;
    export let conflicts: Conflict[];

</script>

{#each conflicts as conflict }
    <p>{conflict.getExplanation(context, $languages[0])}</p>
{/each}