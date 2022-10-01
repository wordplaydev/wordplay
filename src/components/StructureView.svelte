<script lang="ts">
    import type Structure from "../runtime/Structure";
    import EvaluationView from "./EvaluationView.svelte";

    export let value: Structure;

</script>

<EvaluationView evaluation={value.context}/>
