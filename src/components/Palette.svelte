<script lang="ts">
    import { getDragged } from "../editor/Contexts";
    import NodeView from "../editor/NodeView.svelte";
    import { parseBind, parseExpression, parseType, tokens } from "../parser/Parser";
    import { project, updateProject } from "../models/stores";
    import Program from "../nodes/Program";
    import ExpressionPlaceholder from "../nodes/ExpressionPlaceholder";
    import type { Statement } from "../nodes/Block";

    const expressions: Statement[] = [
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
    expressions.push(parseBind(tokens("_: _") ));

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

    let dragged = getDragged();

    function handleDrop() {

        if($dragged === undefined) return;

        const program = $dragged.getRoot();
        if(!(program instanceof Program)) return;

        // Find the source that contains the dragged root.
        const source = $project.getSourceWithProgram(program);
        if(source === undefined) return;

        // Figure out what to replace the dragged node with. By default, we remove it.
        let replacement = $dragged.inList() ? 
            undefined :
            (new ExpressionPlaceholder()).withPrecedingSpace($dragged.getPrecedingSpace(), true);

        // Update the project with the new source files
        updateProject($project.withSource(source, source.withProgram(program.clone(false, $dragged, replacement))));

    }

</script>

<section on:mouseup={handleDrop}>
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