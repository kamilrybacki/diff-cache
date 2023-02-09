export interface CommitComparisonResponse {
  url: string;
  html_url: string;
  permalink_url: string;
  diff_url: string;
  patch_url: string;
  base_commit: CommitData;
  merge_base_commit: CommitData;
  status: "diverged" | "ahead" | "behind" | "identical";
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  commits: CommitData[];
  files?: DiffEntry[];
  [k: string]: unknown;
}

export interface CommitData {
  url: string;
  sha: string;
  node_id: string;
  html_url: string;
  comments_url: string;
  commit: {
    url: string;
    author: null | WhoTriggeredCommitInfo;
    committer: null | WhoTriggeredCommitInfo;
    message: string;
    comment_count: number;
    tree: {
      sha: string;
      url: string;
      [k: string]: unknown;
    };
    verification?: Verification;
    [k: string]: unknown;
  };
  author: null | CommitOwnerInfo;
  committer: null | CommitOwnerInfo;
  parents: {
    sha: string;
    url: string;
    html_url?: string;
    [k: string]: unknown;
  }[];
  stats?: {
    additions?: number;
    deletions?: number;
    total?: number;
    [k: string]: unknown;
  };
  files?: DiffEntry[];
  [k: string]: unknown;
}

export interface WhoTriggeredCommitInfo {
  name?: string;
  email?: string;
  date?: string;
  [k: string]: unknown;
}

export interface Verification {
  verified: boolean;
  reason: string;
  payload: string | null;
  signature: string | null;
  [k: string]: unknown;
}

export type GitTreeAPIEntryData = {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size: number;
  url: string;
};

export type WorkflowFile = {
  path: string;
  content: string;
};