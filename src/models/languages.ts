import { writable, type Writable } from "svelte/store";
import type LanguageCode from "../nodes/LanguageCode";

// An app-wide list of preferred languages.
export const languages: Writable<LanguageCode[]> = writable<LanguageCode[]>(["eng"]);
