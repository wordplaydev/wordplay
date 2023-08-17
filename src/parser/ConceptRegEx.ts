import { LINK_SYMBOL } from './Symbols';

const ConceptRegEx = `${LINK_SYMBOL}(?!(https?)?://)[a-zA-Z/]*`;
export default ConceptRegEx;
