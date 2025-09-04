<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import type { LocaleTextAccessor } from '@locale/Locales';

    interface Props {
        submit: () => void;
        feedback: LocaleTextAccessor | undefined;
        children?: import('svelte').Snippet;
    }

    let { submit, feedback, children }: Props = $props();
</script>

<form class="login-form" onsubmit={submit}
    >{@render children?.()}{#if feedback}<Notice text={feedback} />{/if}</form
>

<style>
    .login-form {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        margin-block-start: 1em;
    }
</style>
