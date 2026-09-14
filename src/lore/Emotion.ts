const Emotion = {
    angry: 'angry',
    arrogant: 'arrogant',
    bored: 'bored',
    cheerful: 'cheerful',
    curious: 'curious',
    confused: 'confused',
    eager: 'eager',
    excited: 'excited',
    grumpy: 'grumpy',
    happy: 'happy',
    insecure: 'insecure',
    kind: 'kind',
    neutral: 'neutral',
    sad: 'sad',
    scared: 'scared',
    serious: 'serious',
    shy: 'shy',
    surprised: 'surprised',
    precise: 'precise',
} as const;

export type Emotion = (typeof Emotion)[keyof typeof Emotion];

const Emotions: readonly Emotion[] = Object.values(Emotion);

/** Whether text (from a locale or tutorial file) names an emotion. */
export function isEmotion(text: string): text is Emotion {
    return Emotions.some((emotion) => emotion === text);
}

export { Emotion };
export default Emotion;
