export const config = {
  retriesEnabled: true,
  message:
    "Don't close this issue. This is an automatic message by [Fresh](https://github.com/c-hive/fresh) - a bot against stale bots.",
};

export function devEnv() {
  return process.env.NODE_ENV === "dev";
}
