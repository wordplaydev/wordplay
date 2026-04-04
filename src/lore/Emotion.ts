const Emotion = {
    '$?': '$?',
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

export { Emotion };
export default Emotion;
