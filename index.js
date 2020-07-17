const core = require("@actions/core");
const { Octokit } = require("@octokit/action");
const { throttling } = require("@octokit/plugin-throttling");
const moment = require("moment");

const devEnv = process.env.NODE_ENV === "dev";

if (devEnv) {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  require("dotenv-safe").config();
}

const regExes = {
  botMatchers: {
    users: [new RegExp("\\w*bot\\w*")],
    bodies: [new RegExp("^This issue has been automatically marked as stale")],
  },
  // Otherwise, the escape characters are removed from the expression.
  // eslint-disable-next-line prettier/prettier, no-useless-escape
  commentUrlParams: new RegExp("(?:https:\/\/)(?:api\.github\.com)\/(?:repos)\/(?<owner>[\\w-]+)\/(?<repo>[\\w-]+)\/(?:issues)\/(?<issue_number>[0-9]+)"),
};

const configs = {
  retriesEnabled: true,
  message:
    "Don't close this issue. This is an automatic message by [Fresh](https://github.com/c-hive/fresh) - a bot against stale bots.",
};

function isBot(user, body) {
  const userMatch = regExes.botMatchers.users.some((userRegex) =>
    userRegex.test(user)
  );
  const bodyMatch = regExes.botMatchers.bodies.some((bodyRegex) =>
    bodyRegex.test(body)
  );

  return userMatch && bodyMatch;
}

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
      since: moment().subtract(7, "days").toISOString(),
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
        const releaseNotification = data.author && !data.user;

        if (releaseNotification) {
          return new Promise((resolve) => {
            console.log("Release notification detected: ", subjectUrl);

            resolve();
          });
        }

        const { login: user } = data.user;
        const { body } = data;

        if (!isBot(user, body)) {
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

        const commentParams = regExes.commentUrlParams.exec(subjectUrl);

        return octokit.issues.createComment({
          ...commentParams.groups,
          body: configs.message,
        });
      });
    });

    return Promise.all(promises);
  });
}

run().catch((err) => {
  core.setFailed(err.toString());
});
