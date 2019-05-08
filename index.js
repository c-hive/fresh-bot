const queryString = require('query-string');
const Octokit = require('@octokit/rest').plugin(require('@octokit/plugin-throttling'))
const UrlPattern = require('url-pattern');
const moment = require('moment');
const axios = require('axios');
axios.defaults.headers.post['Accept'] = 'application/json';

// TODO: get rid of probot, an octokit + express app should be sufficient
module.exports = app => {
  app.log('Yay, the app was loaded!')

  app.on('issues.opened', async context => {
    const issueComment = context.issue({ body: 'Thanks for opening this issue!' })
    return context.github.issues.createComment(issueComment)
  })

  const server = app.route()

  const message = "Don't close this issue please. This is automatic message by [Yes, my issue is important](https://github.com/thisismydesign/yes-my-issue-is-important) - a bot against stable bots."

  server.get('/login', async (req, res) => {
    // GitHub needs us to tell it where to redirect users after they've authenticated
    const protocol = req.headers['x-forwarded-proto'] || req.protocol
    const host = req.headers['x-forwarded-host'] || req.get('host')
  
    const params = queryString.stringify({
      client_id: process.env.CLIENT_ID,
      scope: "notifications public_repo",
      redirect_uri: `${protocol}://${host}/${process.env.CALLBACK_URL_PATH}`
    })

    const url = `https://github.com/login/oauth/authorize?${params}`
    res.redirect(url)
  })

  server.get('/login/cb', async (req, res) => {
    
    // Exchange our "code" and credentials for a real token
    const response = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      code: req.query.code
    })

    // Authenticate our Octokit client with the new token
    const token = response.data.access_token
    const octokit = new Octokit({
      auth: 'token ' + token,
      throttle: {
        onRateLimit: (retryAfter, options) => {
          console.warn(`Request quota exhausted for request ${options.method} ${options.url}`)
    
          if (options.request.retryCount === 0) { // only retries once
            console.log(`Retrying after ${retryAfter} seconds!`)
            return true
          }
        },
        onAbuseLimit: (retryAfter, options) => {
          // does not retry, only logs a warning
          console.warn(`Abuse detected for request ${options.method} ${options.url}`)
        }
      }
    })

    const notifications_request = octokit.activity.listNotifications.endpoint.merge({
      all: true,
      since: moment().subtract(2 , 'day')
    })
    const notifications = await octokit.paginate(notifications_request)

    notifications.forEach(async (notification) => {
      const latest_comment_url = notification.subject.latest_comment_url
      const subject_url = notification.subject.url
      if (!latest_comment_url || !subject_url) {
        return
      }

      const comment_response = await octokit.request(latest_comment_url).catch(() => {})
      if (!comment_response) {
        return
      }

      const user = comment_response.data.user.login
      const body = comment_response.data.body

      if(user.match(/\[bot\]$/) && body.match(/^This issue has been automatically marked as stale/)) {
        console.log("bing bing bing!")
        console.log(subject_url)

        const pattern = new UrlPattern('https\\://api.github.com/repos/:owner/:repo/issues/:number');
        const issue_params = pattern.match(subject_url)
        console.log(issue_params)

        // Do _not_ enable this before go-live
        // const comment = await octokit.issues.createComment(issue_params.merge({body: message}))
      }
    })

    res.redirect('/')
  })
}
