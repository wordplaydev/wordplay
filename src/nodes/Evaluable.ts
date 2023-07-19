import type BinaryEvaluate from './BinaryEvaluate';
import type Evaluate from './Evaluate';
import type UnaryEvaluate from './UnaryEvaluate';

type Evaluable = BinaryEvaluate | UnaryEvaluate | Evaluate;
export default Evaluable;
