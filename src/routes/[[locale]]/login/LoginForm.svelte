<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import type { LocaleTextAccessor } from '@locale/Locales';

    interface Props {
        feedback: LocaleTextAccessor | undefined;
        children?: import('svelte').Snippet;
        testid?: string;
    }

    let { feedback, children, testid }: Props = $props();
</script>

<form class="login-form" data-testid={testid}
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
