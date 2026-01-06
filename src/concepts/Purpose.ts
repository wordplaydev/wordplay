enum Purpose {
    /** Project-level concepts  */
    Project = 'Project',
    /** APIs related to program output */
    Outputs = 'Outputs',
    /** APIs related to program input */
    Inputs = 'Inputs',
    /** Language concepts related to decisions */
    Decisions = 'Decisions',
    /** Language concepts related to naming things for later (binds, blocks) */
    Definitions = 'Definitions',
    /** Language concepts related to text logic */
    Text = 'Text',
    /** Language concepts related to number logic */
    Numbers = 'Numbers',
    /** Language concepts related to boolean logic */
    Truth = 'Truth',
    /** Language concepts related to list logic */
    Lists = 'Lists',
    /** Language concepts related to sets and maps */
    Maps = 'Maps',
    /** Language concepts related to tables */
    Tables = 'Tables',
    /** Language concepts related to documentation */
    Documentation = 'Documentation',
    /** Language concepts related to types and conversion */
    Types = 'Types',
    /** Language concepts related to source code */
    Advanced = 'Advanced',
    /** Language concepts that are hidden because they aren't helpful to show */
    Hidden = 'Hidden',
    /** Tutorials and "how to" guides. Placed at the end since it doesn't appear in the UI. */
    How = 'How',
}

export default Purpose;
