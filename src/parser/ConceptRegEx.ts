import { LINK_SYMBOL } from './Symbols';

const ConceptRegEx = `${LINK_SYMBOL}(?!(https?)?://)\\p{Letter}+(/\\p{Letter}+)?`;
export default ConceptRegEx;
