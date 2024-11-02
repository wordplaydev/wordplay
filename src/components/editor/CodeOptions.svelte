<script lang="ts">
    import Node from '@nodes/Node';
    import type Token from '@nodes/Token';
    import MenuTrigger from './MenuTrigger.svelte';

    /** We don't get these until the menu is shown, for performance reasons.*/
    
    interface Props {
        current: Token;
        /** How to handle a selection */
        selection: Node;
    }

    let { current, selection }: Props = $props();
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
