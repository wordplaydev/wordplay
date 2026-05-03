export type Contribution = {
    type: 'commit' | 'issue' | 'pull_request' | 'issue_comment';
    date: string;
    title: string;
    url: string;
};

export type Contributor = {
    login: string;
    name: string | null;
    avatar_url: string;
    html_url: string;
    contributions: Contribution[];
};

export type ContributorsData = {
    created: string | null;
    contributors: Contributor[];
};
