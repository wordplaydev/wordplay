export type GalleryText = {
    /** The display name of the gallery category */
    name: string;
    /** A short description of the kinds of projects in this gallery category */
    description: string;
};

export type GalleryTexts = {
    /** Interactive games with words and symbols */
    games: GalleryText;
    /** Visualizations of and via text */
    visualizations: GalleryText;
    /** Examples of movement and collisions */
    motion: GalleryText;
    /** Projects using volume, pitch, and video as input */
    av: GalleryText;
    /** Simple utilities and applications */
    tools: GalleryText;
    /** Interactive stories and narratives */
    stories: GalleryText;
};
