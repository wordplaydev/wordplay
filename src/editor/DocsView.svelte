<script lang="ts">
    import type Docs from "../nodes/Docs";
import LanguageView from "./LanguageView.svelte";
    import TokenView from "./TokenView.svelte";
    
    export let docs: Docs[];

</script>

{#each docs as doc }<TokenView node={doc.docs}/><LanguageView node={doc.lang}/>{/each}