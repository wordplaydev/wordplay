import Translate from '@google-cloud/translate';
import type { CallableRequest } from 'firebase-functions/v2/https';

export type GetTranslationsInputs = {
    from: string;
    to: string;
    text: string[];
};

export default async function getTranslations(
    request: CallableRequest<GetTranslationsInputs>,
): Promise<string[] | null> {
    const from = request.data.from;
    const to = request.data.to;
    const text = request.data.text;

    try {
        const translator = new Translate.v2.Translate();

        const [translations] = await translator.translate(text, {
            from,
            to,
        });

        return translations;
    } catch (e) {
        console.error(e);
        return null;
    }
}
