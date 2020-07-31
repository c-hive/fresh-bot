# Fresh-bot

#### The opposite of [Stale](https://github.com/apps/stale). A bot against stale bots.

This GitHub Action will leave a comment in your name whenever a stale bot is about to close an issue you're subscribed to. _Let the fight begin._

## Why?

Issues don't go away just because you don't look. Many projects maintain a facade of good health by ignoring and auto-closing issues. Closed issues fragment the discussion and discourage outside contributions. It is often unclear whether an issue is still present. And so on. This scenario is a nightmare for developers.

## How?

The action checks notifications and acts when a bot comments a stale warning, usually "*This issue has been automatically marked as stale*". It will then make a comment if no one else did that yet.

It is strict about recognizing stale comments, checking for both user type ("bot") and the content of the message. This is to avoid false positives. The message can be custom, but most of them are covered, e.g.:
- [create-react-app](https://github.com/facebook/create-react-app/issues/7838#issuecomment-592205202)
- [rails](https://github.com/rails/rails/issues/37042#issuecomment-633906487)
- [mocha](https://github.com/mochajs/mocha/issues/2582#issuecomment-341302100)
- [electron-builder](https://github.com/electron-userland/electron-builder/issues/4233#issuecomment-663796807)
- [material-table](https://github.com/mbrn/material-table/issues/1592#issuecomment-652067096)
- ..and many more

## Usage

- Create a repo for running personal actions or use any repo
- Create a [Personal Access Token](https://github.com/settings/tokens) with `repo` scope and set it as a repository secret with the name `PERSONAL_ACCESS_TOKEN`
- Commit the workflow below

`.github/workflows/fresh-bot.yml`
```yml
name: Bump stale issues

on:
  schedule:
    # Run every day at 1am
    - cron: '0 1 * * *'

jobs:
  fresh-bot:
    runs-on: ubuntu-latest

    steps:
      - name: Bump stale issues
        uses: c-hive/fresh-bot@v1
        with:
          GITHUB_TOKEN: ${{ secrets.PERSONAL_ACCESS_TOKEN }} # Needs `repo` scope
```

## Conventions

This project follows [C-Hive guides](https://github.com/c-hive/guides) for code style, way of working and other development concerns.

## License

The project is available as open source under the terms of the [MIT License](http://opensource.org/licenses/MIT).
