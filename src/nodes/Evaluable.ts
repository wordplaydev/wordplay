import type BinaryOperation from './BinaryOperation';
import type Evaluate from './Evaluate';
import type UnaryOperation from './UnaryOperation';

type Evaluable = BinaryOperation | UnaryOperation | Evaluate;
export default Evaluable;
