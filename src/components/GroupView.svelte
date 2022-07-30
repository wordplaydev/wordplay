<script lang="ts">
import type List from "../runtime/List";

    import type Structure from "../runtime/Structure";
    import SentenceView from "./SentenceView.svelte";

    export let group: Structure;
    $: sentences = (group.resolve("sentences") as List).getValues() as Structure[];

</script>

<p style={`text-align: center`}>
    {#each sentences as sentence}
        <SentenceView sentence={sentence} />
    {/each}
</p>
