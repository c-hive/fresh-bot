import { expect } from "chai";

import { isBot } from "./utils";

describe("isBot", () => {
  describe("when data doesn't have bot body", () => {
    const data = {
      user: {
        type: "Bot",
      },
      body: "This issue has NOT been automatically marked as stale",
    };

    it("returns false", () => {
      expect(isBot(data)).to.be.false;
    });
  });

  describe("when data doesn't have a bot type", () => {
    const data = {
      user: {
        type: "User",
      },
      body: "This issue has been automatically marked as stale",
    };

    it("returns false", () => {
      expect(isBot(data)).to.be.false;
    });
  });

  describe("when data has a bot body and bot type", () => {
    const data = {
      user: {
        type: "Bot",
      },
      body: "This issue has been automatically marked as stale",
    };

    it("returns true", () => {
      expect(isBot(data)).to.be.true;
    });
  });

  it("supports create-react-app", () => {
    const body = `
      This issue has been automatically marked as stale because it has not had any recent activity. It will be closed in 5 days if no further activity occurs.
    `;

    const data = {
      user: {
        type: "Bot",
      },
      body,
    };
    expect(isBot(data)).to.be.true;
  });

  it("supports rails", () => {
    const body = `
      This issue has been automatically marked as stale because it has not been commented on for at least three months.
      The resources of the Rails team are limited, and so we are asking for your help.
      If you can still reproduce this error on the 6-0-stable branch or on master, please reply with all of the information you have about it in order to keep the issue open.
      Thank you for all your contributions.
    `;

    const data = {
      user: {
        type: "Bot",
      },
      body,
    };
    expect(isBot(data)).to.be.true;
  });

  it("supports mocha", () => {
    const body = `
      I am a bot that watches issues for inactivity.
      This issue hasn't had any recent activity, and I'm labeling it stale. In 14 days, if there are no further comments or activity, I will close this issue.
      Thanks for contributing to Mocha!
    `;

    const data = {
      user: {
        type: "Bot",
      },
      body,
    };
    expect(isBot(data)).to.be.true;
  });

  it("supports electron-builder", () => {
    const body = `
      Is this still relevant? If so, what is blocking it? Is there anything you can do to help move it forward?

      This issue has been automatically marked as stale because it has not had recent activity. It will be closed if no further activity occurs.
    `;

    const data = {
      user: {
        type: "Bot",
      },
      body,
    };
    expect(isBot(data)).to.be.true;
  });

  it("supports material-table", () => {
    const body = `
      This issue has been automatically marked as stale because it has not had recent activity. It will be closed if no further activity occurs. Thank you for your contributions. You can reopen it if it required.
    `;

    const data = {
      user: {
        type: "Bot",
      },
      body,
    };
    expect(isBot(data)).to.be.true;
  });
});
