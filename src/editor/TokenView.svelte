<script lang="ts">
    import type Token from "../nodes/Token";

    export let node: Token;

</script>

<div>
    { node.text.trim() }
</div>

<style>

    div {
        padding: var(--wordplay-editor-padding);
        white-space: pre;
        display: inline-block;
    }

</style>