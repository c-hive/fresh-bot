const core = require("@actions/core");
const { Octokit } = require("@octokit/action");
const { throttling } = require("@octokit/plugin-throttling");
const UrlPattern = require("url-pattern");
const moment = require("moment");

const devEnv = process.env.NODE_ENV === "dev";

if (devEnv) {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  require("dotenv-safe").config();
}

const configs = {
  retriesEnabled: true,
  botRegex: /\[bot\]$/,
  contentRegex: /^This issue has been automatically marked as stale/,
  pattern: new UrlPattern(
    "https\\://api.github.com/repos/:owner/:repo/issues/:number"
  ),
  message:
    "Don't close this issue please. This is automatic message by [Yes, my issue is important](https://github.com/c-hive/fresh) - a bot against stable bots.",
};

const ThrottledOctokit = Octokit.plugin(throttling);

async function run() {
  const octokit = new ThrottledOctokit({
    throttle: {
      onRateLimit: (retryAfter, options) => {
        console.error(
          `Request quota exhausted for request ${options.method} ${options.url}, number of total global retries: ${options.request.retryCount}`
        );

        console.log(`Retrying after ${retryAfter} seconds!`);

        return configs.retriesEnabled;
      },
      onAbuseLimit: (retryAfter, options) => {
        console.error(
          `Abuse detected for request ${options.method} ${options.url}, retry count: ${options.request.retryCount}`
        );

        console.log(`Retrying after ${retryAfter} seconds!`);

        return configs.retriesEnabled;
      },
    },
  });

  const notificationsRequest = octokit.activity.listNotificationsForAuthenticatedUser.endpoint.merge(
    {
      all: true,
      since: moment().subtract(3, "hours").toISOString(),
    }
  );

  return octokit.paginate(notificationsRequest).then((notifications) => {
    const promises = notifications.map((notification) => {
      const { latest_comment_url: latestCommentUrl } = notification.subject;
      const { url: subjectUrl } = notification.subject;

      if (!latestCommentUrl || !subjectUrl) {
        return new Promise((resolve) => {
          console.log("Missing latest comment or subject url");

          resolve();
        });
      }

      return octokit.request(latestCommentUrl).then(({ data }) => {
        const { login: user } = data.user;
        const { body } = data;

        if (
          !user.match(configs.botRegex) ||
          !body.match(configs.contentRegex)
        ) {
          return new Promise((resolve) => {
            console.log("There's no stale bot comment for ", subjectUrl);

            resolve();
          });
        }

        console.log("Found stale bot comment: ", subjectUrl);

        if (devEnv) {
          return new Promise((resolve) => {
            console.log(
              "Responding to stale bot comments is disabled in development environment."
            );

            resolve();
          });
        }

        const pattern = new UrlPattern(
          "https\\://api.github.com/repos/:owner/:repo/issues/:number"
        );
        const issueUrlParams = pattern.match(subjectUrl);

        return octokit.issues.createComment({
          ...issueUrlParams,
          body: configs.message,
        });
      });
    });

    return Promise.all(promises);
  });
}

run().catch((err) => {
  core.setFailed(err.message);
});
