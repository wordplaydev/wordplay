<script lang="ts">
    import Node from '@nodes/Node';
    import type Token from '@nodes/Token';
    import MenuTrigger from './MenuTrigger.svelte';

    export let current: Token;
    /** We don't get these until the menu is shown, for performance reasons.*/
    /** How to handle a selection */
    export let selection: Node;
</script>

<div class="select">
    {current.getText()}
    <MenuTrigger position={selection}></MenuTrigger>
</div>

<style>
    .select {
        position: relative;
        display: flex;
        flex-direction: row;
    }
</style>
