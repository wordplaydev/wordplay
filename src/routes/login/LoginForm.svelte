<script lang="ts">
    import Feedback from '@components/app/Feedback.svelte';

    export let submit: () => void;
    export let feedback: string | undefined;
</script>

<form class="login-form" on:submit={submit}
    ><slot />{#if feedback}<Feedback>{feedback}</Feedback>{/if}</form
>

<style>
    .login-form {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        padding: 1em;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        margin-block-start: 1em;
    }
</style>
