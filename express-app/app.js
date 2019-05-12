var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const queryString = require('query-string');
const Octokit = require('@octokit/rest').plugin(require('@octokit/plugin-throttling'))
const UrlPattern = require('url-pattern');
const moment = require('moment');
const axios = require('axios');
axios.defaults.headers.post['Accept'] = 'application/json';

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();
var router = express.Router();

router.get('/login', async (req, res) => {
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

router.get('/login/cb', async (req, res) => {
    
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

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', router);
// app.use('/users', usersRouter);

module.exports = app;
