type KeysOfType<NodeType, FieldType> = {
    [Key in keyof NodeType]: Key extends string
        ? NodeType[Key] extends FieldType
            ? Key
            : never
        : never;
}[keyof NodeType];

export { type KeysOfType as default };
