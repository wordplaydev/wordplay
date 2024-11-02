<script lang="ts">
    import type BinaryEvaluate from '@nodes/BinaryEvaluate';
    import type UnaryEvaluate from '@nodes/UnaryEvaluate';
    import CodeOptions from './CodeOptions.svelte';

    interface Props {
        evaluate: BinaryEvaluate | UnaryEvaluate;
    }

    let { evaluate }: Props = $props();
</script>

<CodeOptions current={evaluate.fun.name} selection={evaluate.fun} />
