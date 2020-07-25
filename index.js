import { isBot, commentUrlParamsRegex } from "./src/utils/utils";
import { config } from "./src/config/config";

const core = require("@actions/core");
const { Octokit } = require("@octokit/action");
const { throttling } = require("@octokit/plugin-throttling");
const moment = require("moment");

const devEnv = process.env.NODE_ENV === "dev";

if (devEnv) {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  require("dotenv-safe").config();
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

        return config.retriesEnabled;
      },
      onAbuseLimit: (retryAfter, options) => {
        console.error(
          `Abuse detected for request ${options.method} ${options.url}, retry count: ${options.request.retryCount}`
        );

        console.log(`Retrying after ${retryAfter} seconds!`);

        return config.retriesEnabled;
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
          return Promise.resolve();
        }

        if (!isBot(data)) {
          return new Promise((resolve) => {
            console.log(
              "Comment for",
              latestCommentUrl,
              "is not left by a stale bot on issue",
              subjectUrl
            );

            resolve();
          });
        }

        console.log(
          "Found stale bot comment",
          latestCommentUrl,
          "on issue",
          subjectUrl
        );

        if (devEnv) {
          return new Promise((resolve) => {
            console.log(
              "Responding to stale bot comments is disabled in development environment."
            );

            resolve();
          });
        }

        const commentParams = commentUrlParamsRegex.exec(subjectUrl);

        return octokit.issues.createComment({
          ...commentParams.groups,
          body: config.message,
        });
      });
    });

    return Promise.all(promises);
  });
}

run().catch((err) => {
  core.setFailed(err.toString());
});
