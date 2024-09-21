<script lang="ts">
    import Reference from '@nodes/Reference';
    import CodeOptions from './CodeOptions.svelte';

    export let reference: Reference;
</script>

<CodeOptions current={reference.name} selection={reference} />
