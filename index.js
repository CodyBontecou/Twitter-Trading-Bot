require('dotenv').config()
const Twitter = require('twitter')
const config = require('./config.js')
const accountSid = process.env.accountSid
const authToken = process.env.authToken
const twilio = require('twilio')(accountSid, authToken)

const client = new Twitter({
  consumer_key: process.env.consumer_key,
  consumer_secret: process.env.consumer_secret,
  access_token_key: process.env.access_token_key,
  access_token_secret: process.env.access_token_secret,
})

const getID = async (username) => {
  return new Promise((resolve, reject) => {
    client.get(
      'users/lookup',
      { screen_name: username },
      (error, tweets, response) => {
        if (error) console.log(username, error)
        const twitterID = JSON.parse(response.body)[0].id_str
        resolve(twitterID)
      }
    )
  })
}

const sortFollowerIDs = () => {
  return new Promise((resolve, reject) => {
    const followerIDs = []
    config.follows.forEach(async (screenname, i) => {
      await new Promise((r) => setTimeout(r, i * 500))
      const twitterID = await getID(screenname)
      console.log(`TwitterID: ${screenname} ${twitterID}`)
      followerIDs.push(twitterID)
      if (followerIDs.length === config.follows.length) resolve(followerIDs)
    })
  })
}

const startStream = async (followerIDs) => {
  const filter = { filter_level: 'none', follow: followerIDs.join(',') }
  client.stream('statuses/filter', filter, (stream) => {
    stream.on('data', (tweet) => {
      let tweetText = tweet.text
      if (tweet.extended_tweet && tweet.extended_tweet.full_text) {
        tweetText = tweet.extended_tweet.full_text
      }
      tweetText = tweetText.toLowerCase()
      if (!followerIDs.includes(tweet.user.id_str)) return false
      console.log(`[${tweet.user.screen_name}] ${tweetText}`)
      config.keywords.forEach((kw) => {
        const keyword = kw.toLowerCase()
        if (tweetText.includes(keyword)) {
          // executeTrade(keyword);
          console.log(keyword + ' WAS SAID! ' + tweetText)
          twilio.messages
            .create({
              body: keyword + ' WAS SAID! ' + tweetText,
              from: '+18082077121',
              to: '+19702754211',
            })
            .then((message) => console.log(message.sid))
        }
      })
    })
    stream.on('error', (error) => {
      console.log(error)
    })
    stream.on('disconnect', (error) => {
      console.log('Stream Disconnected...')
      startStream()
    })
    console.log('Twitter API Stream Started')
    setTimeout(() => {
      stream.destroy()
      startStream(followerIDs)
    }, 3600000) // reset stream
  })
}

const init = async () => {
  const followerIDs = await sortFollowerIDs()
  startStream(followerIDs)
}

init()

process.on('unhandledRejection', (reason, p) => {
  console.log('ERROR 110', reason)
})
