export function isBot(commentData) {
  const userTypeRegex = new RegExp("^Bot$");
  const bodyRegexes = [
    new RegExp("This issue has been automatically marked as stale"),
    new RegExp("This issue hasn't had any recent activity"),
  ];

  const { type } = commentData.user;
  const { body } = commentData;

  const userMatch = userTypeRegex.test(type);
  const bodyMatch = bodyRegexes.some((bodyRegex) => bodyRegex.test(body));

  return userMatch && bodyMatch;
}

export const commentUrlParamsRegex = new RegExp(
  "(?:https://)(?:api.github.com)/(?:repos)/(?<owner>[\\w-]+)/(?<repo>[\\w-]+)/(?:issues)/(?<issue_number>[0-9]+)"
);
