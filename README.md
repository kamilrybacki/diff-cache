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

![Visual representation of Diff Cache Workflow](https://github.com/KamilRybacki/diff-cache/blob/media/use_case_diagram.png)

## Usage

This Action can be used in the following way (as a step in the Workflow):

```yaml
- uses: KamilRybacki/diff-cache@v[version]
    with:
      # REQUIRED: Regex to use to match the files to include in the cache
      include: '.*.py'
      # REQUIRED: Secret containing the cache. Doesn't have to be prepared beforehand, it will be created if it doesn't exist (see Note below).
      cache_secret: ${{ secrets.CACHE_SECRET }}
      # REQUIRED: Github token to use for the API calls. It is required to be able to create the cache secret and to be able to update it (see Note below).
      token: ${{ secrets.TOKEN }}
      # OPTIONAL: Regex to use to match the files to exclude from the cache check.
      exclude: '.*/dont/check/this/.*'
```

After running this Action, the list of the files to check is available through the `files` output e.g.:

```yaml
- name: Get changed Python files
  id: python-files-search
  uses: KamilRybacki/diff-cache@v[version]
    with:
      include: '.*.py'
      cache_secret: ${{ secrets.CACHE_SECRET }}
      token: ${{ secrets.TOKEN }}
- name: Some step that uses the result of the Diff Cache action
  env:
    FILES_TO_CHECK: ${{ python-files-search.outputs.files }}
  run: mypy ${FILES_TO_CHECK} # Or whatever command really
```
This output contains a whitespace delimtied list of files that were modified during current commit + files stored in the cache.

### Note

The `token` needs to have the necessary scopes for reading Workflow info and managing repo Secrets.
The most secure solution is to use a fine-grained token, with only the necessary scopes. Check the [Github documentation](https://docs.github.com/en/actions/reference/authentication-in-a-workflow#permissions-for-the-github_token) for more information about enabling the necessary scopes.

#### **IMPORTANT**

The secret MUST be created by the user **ONCE** (before using the Action for the 1st time) and then it is updated by the Action **automatically**.
Sadly, there is no way to create a secret from within the Workflow file **if its not present**, so it has to be created beforehand
(at least from the side of my implementation, the user can do some magic with API calls and finding the secret etc.).
In other words, **CREATE AND FORGET IT** i.e. don't touch it.
This means that the secret should not be used for anything else. If there is anything present within it,
then the Action will **overwrite its contents**.

The name of the secret is obtained **by parsing** from the Github Workflow file that contains the triggered action.
This may sound confusing but the flow of this Action is as follows:

1. The Action is triggered by the Workflow file.
2. The Action uses the GitHub API to find the location of Workflow file within the latest commit tree.
3. The Action reads the Workflow file i.e. parses its contents and tries to find the `cache_secret` input.
4. Since this input is required, it is guaranteed to be present in the Workflow file, so the GitHub Secret name is read (using Regex magic).
5. This name is used for subsequent API calls to create or update the secret.

Hence, **use one secret per Workflow** (if You plan to trigger this action multiple times in the same Workflow).
If this is not followed, the first occurrence of the `cache_secret` input present in the Workflow file will be used.
In future, an additional guard will be maybe added to halt the execution of the Action if multiple secrets are found.

## How the staged files data is stored?

The cache is structured in the following format:

```json
{
  "[TAG CREATED BY THE ACTION]#1": "file1 file2 file3 ...",
  "[TAG CREATED BY THE ACTION]#2": "file1 file2 file3 ...",
  "[TAG CREATED BY THE ACTION]#3": "file1 file2 file3 ..."
}
```

where the `[TAG CREATED BY THE ACTION]` is the tag created by the Action using the combination of `include` and `exclude` inputs:

```js
const tag = `${include}&&${exclude}`;
```

This structure allows one secret per Workflow to be used with multiple `include` and `exclude` combinations,
which may correspond to multiple checks within the Workflow, based on the extensions, locations and so on of the modified files.
All can be done by the correct set up of the `include` and `exclude` regular expressions.

Before saving this data to the secret, it is stringified using `JSON.stringify`,
compressed by use od `lz-string` library (namely the methods from `LZString` interface)
and then it is properly encrypted using the `libsodium-wrappers` library and repo public key.

This allows for the data to be stored in a small amount of space, and also to be encrypted (as needed by the Github Secrets API).

## The cold hard truth

This Action is not perfect. The problems that it solves are not the most important ones,
and the solutions that it provides may be not the best ones.

One of the motivations for me was to learn how to write a Github Action and navigate the Github API.
I also wanted to learn how to use the `libsodium-wrappers` library, which I used for the encryption of the data.
There may be some cool lessons to learn by studying the `DiffCache` and `ActiveWorkflowFileReader` classes.

If You have idead for improvements, feel free to open an issue or a PR. I will be happy to discuss it with You.
