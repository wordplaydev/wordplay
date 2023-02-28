<script lang="ts">
    import Button from './Button.svelte';
    import Confirm from './Confirm.svelte';

    export let tip: string;
    export let action: () => void;
    export let enabled: boolean = true;
    export let prompt: string;

    let confirming = false;
</script>

{#if confirming}
    <Confirm
        {prompt}
        decide={(yes) => (yes ? action() : (confirming = false))}
    />
{:else}
    <Button {tip} action={() => (confirming = true)} {enabled}><slot /></Button>
{/if}
