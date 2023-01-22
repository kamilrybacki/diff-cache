# DiffCache

## Problem statement

Suppose that you have a large number of files, where their amount takes considerable amount of time
to check or process in some predefined way. In most simple case, this can mean running a linter on a large number of files.

With the increasing number of files, the time it takes to process them increases as well. This is a problem, because
it is not possible to process all files in a single run i.e. CI/CD Workflow run, before a next commit is submitted,
by accident or on purpose, by the developer.

Within this next commit, previously unchecked files are not present in the `diff` between the current and the previous commit,
so they are not processed.

In case of linting this means that the developer can submit a commit with a code that does not pass the linter checks,
and the CI/CD pipeline will not be able to catch this.

You can also easily imagine a situation where a developer can accidentally bypass more serious checks,
like security checks, or even tests (if they are meant to fire when certain files are changed).

## Solutions

### Naive solution

Just check all files within repository, every time. This is a naive solution, because it is not scalable.

### Proposed solution

This solution is based on the idea of caching the results of the standard `git diff` command, and using it to
determine which files should be checked. If there are no changes in the files, then there is no need to check them.
If there are previously cached files that are not present in the current `diff`, then they should be checked as well,
since they were not checked in the previous Workflow run, due to the human error described above (or other causes).

Results of this check are stored within some sort of artifact or other storage,
persistent between CI/CD Workflow runs. This information is used by the subsequent Workflow steps
to check the necessary files. If all files are checked, then the cache is cleared.

## Usage

This Action can be used in the following way (as a step in the Workflow):

```yaml
- uses: KamilRybacki/diffcache@v[version]
    with:
      # REQUIRED: Regex to use to match the files to include in the cache
      include: '.*.py'
      # REQUIRED: Secret containing the cache. Doesn't have to be prepared beforehand, it will be created if it doesn't exist (see Note below).
      cache_secret: ${{ secrets.CACHE_SECRET }}
      # REQUIRED: Github token to use for the API calls. It is required to be able to create the cache secret and to be able to update it (see Note below).
      token: $${{ secrets.TOKEN }}
      # OPTIONAL: Regex to use to match the files to exclude from the cache check.
      exclude: '.*/dont/check/this/.*'
```

### Note

The `token` needs to have the necessary scopes for reading Workflow info and managing repo Secrets.
The most secure solution is to use a fine-grained token, with only the necessary scopes. Check the [Github documentation](https://docs.github.com/en/actions/reference/authentication-in-a-workflow#permissions-for-the-github_token) for more information about enabling the necessary scopes.

#### **IMPORTANT**

The secret MUST be created by the user **ONCE** and then it is updated by the Action **automatically**.
This means that the secret should not be used for anything else. If there is anything present within it,
then the Action will **overwrite its contents**.

The name of the secret is obtained **by parsing** from the Github Worklfow file that contains the triggered action.
This may sound confusing but the flow of this Action is as follows:

1. The Action is triggered by the Workflow file.
2. The Action uses the GitHub API to find the location of Workflow file within the latest commit tree.
3. The Action reads the Workflow file i.e. parses its contents and tries to find the `cache_secret` input.
4. Since this input is required, it is guaranteed to be present in the Workflow file, so the GitHub Secret name is read (using Regex magic).
5. This name is used for subsequent API calls to create or update the secret.

Hence, **use one secret per Workflow** (if You plan to trigger this action multiple times in the same Workflow).
If this is not followed, the first occurrence of the `cache_secret` input present in the Workflow file will be used.
