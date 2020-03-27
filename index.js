const core = require("@actions/core");
const { Octokit } = require("@octokit/action");
const { throttling } = require("@octokit/plugin-throttling");
const moment = require("moment");

const devEnv = process.env.NODE_ENV === "dev";

if (devEnv) {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  require("dotenv-safe").config();
}

const configs = {
  retriesEnabled: true,
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
      since: moment().subtract(2, "days").toISOString(),
    }
  );

  await octokit.paginate(notificationsRequest);
}

run().catch((err) => {
  core.setFailed(err.message);
});
