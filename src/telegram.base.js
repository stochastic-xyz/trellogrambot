
const TelegramBot = require('node-telegram-bot-api')
const Loki = require('lokijs')
const eventEmitter = require('events').EventEmitter
const _ = require('lodash')
const asy = require('async')
/**
 *
 * TODO:
 *
 * Close Poll:
 * close user's running poll and update trello
 *
 * Voting:
 * Reply to message to vote
 *
 */

let fill = (n) => {
  return Array.apply(null, Array(n)).map(Number.prototype.valueOf, 0)
}
class TelegramBase extends eventEmitter {
  constructor (params) {
    super()

    // Replies we are listening too
    this.live_polls = []
    // Interval functions
    this.workers = {}
    // Run Member count on first time running
    this._run_changeChatMember = false
    this.initDatabase(() => {
      this.bot = new TelegramBot(params.key, {polling: true})
      this.chatId = params.chat_id
      if (!this.chatId) {
        console.log('=======================================')
        console.log('ERROR_NO_CHAT_ID_FOUND')
        console.log('RUN THE /ping COMMAND to set chat id')
        console.log('=======================================')
        return
      }
      this.start()
      this.listenToPollReply()
    })
  }

  initDatabase (cb) {
    this.loki = new Loki('./db/chat_data.json', {autosave: true,
      autoload: true,
      autoloadCallback: () => {
        this.db_chat = this.loki.getCollection('chat')
        if (!this.db_chat) {
          this.db_chat = this.loki.addCollection('chat')
        }
        this.db_polls = this.loki.getCollection('poll')
        if (!this.db_polls) {
          this.db_polls = this.loki.addCollection('poll')
        }
        this.loki.saveDatabase()
        cb()
      }})
  }

  onPing (msg) {
    if (!this.chatId) {
      this.chatId = msg.chat.id
      this.start()
      this.listenToPollReply()
      console.log('CHAT ID SET')
      console.log('CHAT ID:  ' + this.chatId)
    }
  }

  replyToMessage (text, replyId) {
    this.bot.sendMessage(this.chatId, text, {reply_to_message_id: replyId})
  }

  updatePoll (poll) {
    poll.updated_at = +new Date()
    this.db_polls.findAndUpdate({id: poll.id}, () => {
      return poll
    })
  }

  getAllOpenPolls () {
    return this.db_polls.find({open: true})
  }

  getPollFromReplyId (msgId) {
    return this.db_polls.findOne({msg_id: msgId})
  }

  getUserPoll (user_id) {
    return this.db_polls.findOne({user_id, open: true})
  }

  tallyVotes () {
    const polls = this.db_polls.find({new_votes: true})
    asy.each(polls, (poll, cb) => {
      let n = poll.options.length
      poll.tally = {
        count: fill(n),
        percentage: fill(n),
        total_count: 0
      }
      poll.votes.forEach((vote) => {
        let index = vote.vote - 1
        if (_.isUndefined(poll.tally.count[index])) {
          return
        }
        poll.tally.count[index]++
        poll.tally.total_count++
      })
      poll.votes.forEach((vote) => {
        let index = vote.vote - 1
        if (_.isUndefined(poll.tally.count[index])) {
          return
        }
        poll.tally.percentage[index] = ((poll.tally.count[index] / poll.tally.total_count) * 100).toFixed(2)
      })
      poll.new_votes = false
      poll.new_tally = true
      this.updatePoll(poll)
      console.log('updated')
    }, () => {
      this.loki.saveDatabase()
    })
  }

  updateTrello () {
    const polls = this.db_polls.find({new_tally: true})
    if (!polls || polls.length === 0) {
      return
    }
    this.emit('change.tally', polls)
    polls.forEach((poll) => {
      poll.new_tally = false
      this.updatePoll(poll)
    })
    this.loki.saveDatabase()
  }

  async start () {
    this.workers.memberCount = setInterval(() => {
      this.onChangeChatMember()
    }, 1000)
    this.workers.tallyVotes = setInterval(() => {
      this.tallyVotes()
    }, 1000)
    this.workers.updateTrelloPoll = setInterval(() => {
      this.updateTrello()
    }, 1000)
    this.bot.onText(/\/newpoll/, this.onNewPoll.bind(this))
    this.bot.onText(/\/closepoll/, this.onClosePoll.bind(this))
    this.bot.onText(/\/ping/, this.onPing.bind(this))
  }
}

module.exports = TelegramBase
