## CONTRIBUTING.md
So you want to help out? Great! There's a number of ways you can get involved.

## Filing issues
[GitHub Issues](https://github.com/nicholaiii/teamspeak-async/issues) are used for all discussions around the codebase, including **bugs**, **features**, and other **enhancements**.

When filling out an issue, make sure to fill out the questions in the template

### Reporting a Bug
A bug is a demonstrable problem that is caused by the code in the repository. Good bug reports are extremely helpful. Thank You!

### Requesting a Feature
Please write an issue if you have ideas for features you think would benefit the project.

## Code of Conduct
Please read and adhere to the [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## Contributing Code
You are more than welcome to help out writing code for the project, whether it be features, docs or fixes.
There are a few, simple guidelines you will need to follow to contribute.

#### Setting up
- You will need at least Node 7.6 and npm 4
- Clone the repository and run `npm install`.
- To build the code, run `npm run build`.

#### Commiting code
- teamspeak-async uses [xo](https://github.com/sindresorhus/xo) for linting, and it is advisable to run `npm test` to run the linter at least once before commiting, as it will run on commit and fail if anything is out of place.
- The project uses conventional-changelog standards for commit messages and it is highly advised that you use the commitizen cli tool to commit your code.
- To install
`npm install -g commitizen cz-conventional-changelog`
- To commit your code, run `git cz` and follow the prompts.

- Scope could be anything specifying place of the commit change. For example queue, request, TeamSpeakClient (the class and its methods), package (the package.json), or * denoting a change in multiple places.
- The subject itself should be in imperative, present tense: “change” not “changed” nor “changes”. See examples [here](https://gist.github.com/stephenparish/9941e89d80e2bc58a153#examples)

#### Submitting a pull request
- Any change is best discussed in an issue first, to prevent you from doing unneccesary work.
- You might be asked to do changes to your pull request. There's never a need to open another pull request. [Just update the existing one.](https://github.com/RichardLitt/docs/blob/master/amending-a-commit-guide.md)
