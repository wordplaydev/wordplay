<script lang="ts">
    let expanded = false;

    function toggle(event: Event) {
        expanded = !expanded;
        event.stopPropagation();
    }
</script>

<div
    class="structure"
    tabIndex="0"
    on:click={(event) => toggle(event)}
    on:keydown={(event) => (event.key === 'Enter' ? toggle(event) : undefined)}
    >{#if expanded}<slot name="expanded" />{:else}<slot
            name="collapsed"
        />{/if}</div
>

<style>
    .structure {
        display: inline;
        cursor: pointer;
    }
</style>
