<script lang="ts">
    import type Evaluator from '@runtime/Evaluator';
    import {
        Pause,
        Play,
        Restart,
        StepBack,
        StepBackInput,
        StepBackNode,
        StepForward,
        StepForwardInput,
        StepForwardNode,
        StepOut,
        StepToPresent,
        StepToStart,
    } from '../editor/util/Commands';
    import { getEvaluation } from '../project/Contexts';
    import CommandButton from '../widgets/CommandButton.svelte';
    import Switch from '../widgets/Switch.svelte';

    interface Props {
        evaluator: Evaluator;
    }

    let { evaluator }: Props = $props();

    const evaluation = getEvaluation();
</script>

<CommandButton command={Restart} />
<Switch
    on={$evaluation?.playing === true}
    toggle={(play) => (play ? evaluator.play() : evaluator.pause())}
    offTip={Pause.description}
    onTip={Play.description}
    offLabel={Pause.symbol}
    onLabel={Play.symbol}
    uiid="playToggle"
/>
<CommandButton command={StepToStart} />
<CommandButton command={StepBackInput} />
<CommandButton command={StepBackNode} />
<CommandButton command={StepBack} />
<CommandButton command={StepOut} />
<CommandButton command={StepForward} />
<CommandButton command={StepForwardNode} />
<CommandButton command={StepForwardInput} />
<CommandButton command={StepToPresent} />
