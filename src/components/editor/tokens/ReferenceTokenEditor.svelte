<script lang="ts">
    import Reference from '@nodes/Reference';
    import CodeOptions from './CodeOptions.svelte';

    interface Props {
        reference: Reference;
    }

    let { reference }: Props = $props();
</script>

<CodeOptions current={reference.name} selection={reference} />
