export type ContributionType =
    | 'commit'
    | 'issue'
    | 'pull_request'
    | 'issue_comment'
    | 'pr_review'
    | 'pr_review_comment';

export type Contributor = {
    login: string;
    name: string | null;
    avatar_url: string;
    html_url: string;
    counts: Record<ContributionType, number>;
    latest: string;
};

export type ContributorsData = {
    created: string | null;
    contributors: Contributor[];
};

export type Teacher = {
    name: string;
    school: string;
    url: string;
};

export type TeachersData = {
    teachers: Teacher[];
};
