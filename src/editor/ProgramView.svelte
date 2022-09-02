<script lang="ts">
    import type Program from "../nodes/Program";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import { caret } from "../models/stores";
    import TokenView from "./TokenView.svelte";

    export let program: Program;

    function handleClick(event: MouseEvent) {
        const el = event.currentTarget;
        if(!(el instanceof HTMLElement)) return;

        // Find the tokens that contain the vertical mouse position.
        const tokenViews = el.querySelectorAll(".token-view");
        const line: HTMLElement[] = [];
        const mouseY = event.clientY;
        const mouseX = event.clientX;
        tokenViews.forEach(token => {
            const tokenBounds = token.getBoundingClientRect();
            const tokenTop = tokenBounds.top;
            const tokenBottom = tokenBounds.bottom;
            if(token instanceof HTMLElement && tokenTop <= mouseY && tokenBottom >= mouseY)
                line.push(token);
        });

        // Of those aligned vertically, find the closest horizontally.
        let closestDistance: number | undefined = undefined;
        let closest: HTMLElement | undefined = undefined;
        let left = false;
        for(let i = 0; i < line.length; i++) {
            const tokenBounds = line[i].getBoundingClientRect();
            const tokenLeftDistance = Math.abs(tokenBounds.left - mouseX);
            const tokenRightDistance = Math.abs(tokenBounds.right - mouseX);
            const tokenDistance = Math.min(tokenLeftDistance, tokenRightDistance);
            if(closestDistance === undefined || tokenDistance < closestDistance) {
                closest = line[i];
                closestDistance = tokenDistance;
                left = tokenLeftDistance < tokenRightDistance;
            }
        };

        if(closest !== undefined && closest.dataset.index !== undefined && closest.dataset.length !== undefined) {
            caret.set($caret?.withPosition(parseInt(closest.dataset.index) + (left ? 0 : parseInt(closest.dataset.length))));
        }

    }

</script>

<NodeView node={program} block>
    <span on:mousedown={handleClick}>
        {#each program.borrows as borrow}<OptionalNodeView node={borrow}/>{/each}<OptionalNodeView node={program.block}/><TokenView node={program.end}/>
    </span>
</NodeView>