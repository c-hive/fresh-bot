import { run } from "./src/run";

const core = require("@actions/core");

run().catch((err) => {
  core.setFailed(err.toString());
});
