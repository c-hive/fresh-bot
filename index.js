const queryString = require('query-string');
const Octokit = require('@octokit/rest')
const moment = require('moment');
const axios = require('axios');
axios.defaults.headers.post['Accept'] = 'application/json';

// TODO: import plugin as throttling from '@octokit/plugin-throttling'

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  // Your code here
  app.log('Yay, the app was loaded!')

  app.on('issues.opened', async context => {
    const issueComment = context.issue({ body: 'Thanks for opening this issue!' })
    return context.github.issues.createComment(issueComment)
  })

  const server = app.route()

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

  server.get('/whoami', async (req, res) => {
    const octokit = await app.auth()
    const { data } = await octokit.apps.getAuthenticated()
    res.json(data)
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
    const octokit = new Octokit()
    octokit.authenticate({ type: 'token', token })
  
    // Get the currently authenticated user
    const user = await octokit.users.getAuthenticated()
    // console.log(user.data) // <-- This is what we want!
    console.log(moment().subtract(2 , 'day'));

    const notifications = await octokit.activity.listNotifications({
      all: true,
      per_page: 100,
      since: moment().subtract(2 , 'day')
    })
    console.log(notifications.data)

    notifications.data.forEach((notification) => {
      const latest_comment_url = notification.subject.latest_comment_url
      if (!latest_comment_url) {
        return
      }
      console.log(latest_comment_url)

      console.log(Octokit.get(latest_comment_url))
      const comment = Octokit.get(latest_comment_url)
      console.log(comment.data.body)
    })

    // "This issue has been automatically marked as stale"

    // octokit.issues.getComment({
    //   owner,
    //   repo,
    //   comment_id
    // })

    // const comment = await octokit.issues.createComment({
    //   owner
    //   repo
    //   body
    //   number
    // })
    // console.log(comment.data)
  
    // Redirect after login
    res.redirect('/')
  })

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}
