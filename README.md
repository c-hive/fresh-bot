# Fresh

#### The opposite of [Stale](https://github.com/apps/stale). A bot against stale bots.

This GitHub Action will leave a comment in your name whenever a stale bot is about to close an issue you're subscribed to. _Let the fight begin._

## Why?

Issues don't go away just because you don't look. Many projects maintain a facade of good health by ignoring and auto-closing issues. Closed issues discourage outside contribution. It is often unclear whether an issue is still present. And so on. This scenario is a nightmare for developers.

## How?

The action queries user-level notifications within a certain timeframe to seek and identify automated stale bot comments, usually starting with "*This issue has been automatically marked as stale*".

## Usage

The personal access token has to have *full control of private repositories* scope enabled to query notifications and be able to comment in your name as needed.

```yml
name: Automated response to stale bot comments

on:
  schedule:
    # Every day at 1am
    - cron: '0 1 * * *'

  jobs:
    name: stale-bot-response:
      runs-on: ubuntu-latest

      steps:
        - name: Uses c-hive/fresh
          uses: c-hive/fresh@v1
          with:
            GITHUB_TOKEN: ${{ secrets.GITHUB_PERSONAL_ACCESS_TOKEN }}
```

## Conventions

This project follows [C-Hive guides](https://github.com/c-hive/guides) for code style, way of working and other development concerns.

## License

The project is available as open source under the terms of the [MIT License](http://opensource.org/licenses/MIT).
