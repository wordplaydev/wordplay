/**
 * Verifier-side re-export of the shared template-input introspection. Lives
 * in `src/locale/templateInputs.ts` so both Node-only verification scripts
 * and the in-app /localize editor can use the same schema walker and
 * reference parser.
 */
export {
    checkTemplateInputs,
    getDeclaredInputs,
    getTemplateReferences,
    getTerminologyNames,
} from '@locale/templateInputs';
