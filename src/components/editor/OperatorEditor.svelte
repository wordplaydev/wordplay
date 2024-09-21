<script lang="ts">
    import type BinaryEvaluate from '@nodes/BinaryEvaluate';
    import type UnaryEvaluate from '@nodes/UnaryEvaluate';
    import CodeOptions from './CodeOptions.svelte';

    export let evaluate: BinaryEvaluate | UnaryEvaluate;
</script>

<CodeOptions current={evaluate.fun.name} selection={evaluate.fun} />
