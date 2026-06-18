import PatternNode from '@nodes/PatternNode';

/**
 * A pattern ATOM: the subset of {@link PatternNode}s the parser accepts wherever
 * a single atom is expected — a class, literal text, set, group, anchor,
 * word/word-edge, lookaround, case-fold, rest, or backreference (see
 * `parsePatternAtom`). The prefixed items — {@link PatternCapture},
 * {@link PatternQuantified}, {@link PatternComplement} — are NOT atoms; they're
 * valid only as sequence members. Encoding the distinction in the type hierarchy
 * lets the grammar say `node(PatternAtom)` for atom-only slots (a capture's,
 * complement's, or quantifier's atom), so the editor offers only atoms there
 * instead of every pattern node (which would produce unparseable trees).
 */
export default abstract class PatternAtom extends PatternNode {}
