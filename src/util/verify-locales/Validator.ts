import Ajv from 'ajv';

// Initialize the schema validator.
const Validator = new Ajv({ strictTuples: false, allErrors: true });

export default Validator;
