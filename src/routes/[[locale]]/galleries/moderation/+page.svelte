<!-- Retired (#938). Reported messages are now reviewed from /moderate, beside
     the other two queues — they're the same job, and a curator shouldn't have
     to know a second URL.

     A client-side redirect rather than SvelteKit's `redirect()`: this route
     lives under [[locale]], and a bare redirect to '/moderate' would drop the
     reader's locale segment. Kept as a redirect rather than deleted because the
     notification bell has been linking here, and those links are in people's
     history. -->
<script lang="ts">
    import Loading from '@components/app/Loading.svelte';
    import { localeGoto } from '@util/localeGoto';
    import { onMount } from 'svelte';

    onMount(() => {
        localeGoto('/moderate');
    });
</script>

<Loading />
