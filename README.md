gitreview
------

`gitreview -- Summarize files changed in current topic branch`

`gitreview` is a wrapper around this git command:

    $ git log --oneline --reverse --name-only master..HEAD

I use this command when considering whether to squash any commits before submitting
a pull request to merge the topic branch into master. Rather than remembering the whole
command, I defined this alias in my `.gitconfig`:

```
[alias]
    review = log --oneline --reverse --name-only master..HEAD
```

`gitreview` produces listings like this:

```
64f00c8a  title of first commit in topic branch
    path/to/file/changed/a
e2d395b1  title of second commit in topic branch
    path/to/file/changed/b
    path/to/file/changed/c
23de746f  title of second commit in topic branch
    path/to/file/changed/b

path/to/file/changed/b
    e2d395b1
    23de746f
```

The `gitreview` wrapper enhances the output of `git review` in two ways:

1. It bolds each commit line (not shown above), and indents each file path, making the listing easier to read.
2. It records for each file the commits in which the file changed, and then appends the inverted listing, listing the files that where changed in two or more commits. In the above example, only one file was changed in multiple commits, so the inverted listing inluded only the commits in which `path/to/file/changed/b` was changed.

NOTES
-----

1. `gitreview` assumes by default that your topic branch was created as a branch from `master`. If you created the branch from some other branch or commitish you should specify that branch with the `--branch` option.
2. `gitreview` explicitly requests `git log` to abbreviate commit hashes to a specified length, defaulting to 8. This is done by using the `--abbrev` option to `git log`.

USAGE
-----

```
  Usage: gitreview [options]

  Summarize files changed in current topic branch

  Options:

    -h, --help                output usage information
    -b, --branch [commitish]  The commitish the topic branch was created from [master]
    -a, --abbrev [digits]     Abbreviate commit hashes to the number of digits [8])
```
