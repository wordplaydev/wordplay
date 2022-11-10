<script lang="ts">
    import type { InsertionPoint } from "../models/Caret";
    import Block from "../nodes/Block";
    import Docs from "../nodes/Docs";
    import Program from "../nodes/Program";

    export let insertion: InsertionPoint;

</script>

{#if insertion.node instanceof Block || insertion.node instanceof Docs || insertion.node instanceof Program}<br/>{/if}<span class="line"></span>

<style>
    .line {
        display: inline-block;
        vertical-align: middle;
        height: 2em;
        width: 0;
        outline: 2px solid var(--wordplay-highlight);
        animation-name: grow;
        animation-duration: 0.25s;
        animation-iteration-count: 1;
        z-index: 2;
    }

    br {
        display: block;
        content: "";
        margin-top: 1em;
        animation-name: grow-top;
        animation-duration: 0.25s;
        animation-iteration-count: 1;
    }

    @keyframes grow {
        0% {
            font-size: 0;
            height: 0;
        }

        100% {
            font-size: inherit;
            height: 2em;
        }
    }

    @keyframes grow-top {
        0% {
            margin-top: 0;
        }

        100% {
            margin-top: 1em;
        }
    }

</style>