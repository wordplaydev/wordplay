<script lang="ts">
    import NodeView from "../editor/NodeView.svelte";
    import { parseExpression, parseType, tokens } from "../parser/Parser";

    const expressions = [
        "_[ _ ]",
        "_{ _ }",
        "_._",
        "(_)",
        "'\\_\\'",
        "_ ∆ _ _",
        "_ ? _ _",
        "ƒ _() _",
        "_ → _"
    ].map(code => parseExpression(tokens(code)));
    expressions.forEach(node => node.cacheParents());

    const types = [
        "?",
        "#",
        "''",
        "!",
        "[ _ ]",
        "{ _ }",
        "{ _ : _ }",
        "_ • _"
    ].map(code => parseType(tokens(code)));
    types.forEach(node => node.cacheParents());

</script>

<section>
    <h2>Palette</h2>

    <h3>Expressions</h3>

    {#each expressions as expression}
        <div class="item"><NodeView node={expression}/></div>
        <br/>
    {/each}

    <h3>Types</h3>

    {#each types as type}
        <div class="item"><NodeView node={type}/></div>
        <br/>
    {/each}
</section>

<style>
    section {
        max-width: 15em;
        min-width: 15em;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        background: var(--wordplay-chrome);
        padding: var(--wordplay-spacing);
        user-select: none;
    }

    .item {
        display: inline-block;
        margin-block-start: var(--wordplay-spacing);
        margin-block-end: var(--wordplay-spacing);
        cursor: pointer;
    }
</style>