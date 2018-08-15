
const TelegramBase = require('./telegram.base')
const _ = require('lodash')
/**
 *
 * TODO:
 *
 * Bump:
 * Repost poll
 *
 */

const MAX_OPTION_COUNT = 5
const MIN_OPTION_COUNT = 2
class Telegram extends TelegramBase {
  async closeUserPoll (userId) {
    let deleted = false
    this.db_polls
      .findAndUpdate(
        {
          open: true,
          user_id: userId
        },
        (poll) => {
          poll.open = false
          poll.closed_at = +new Date()
          deleted = true
          return poll
        }
      )
    this.loki.saveDatabase()
    return deleted
  }

  async onClosePoll (msg) {
    let poll = this.getUserPoll(msg.from.id)
    try {
      if (!await this.closeUserPoll(msg.from.id)) {
        return
      }
    } catch (err) {
      console.log('ERR_CLOSE_POLL')
      return
    }
    if (_.isUndefined(poll.votes)) {
      this.replyToMessage(`Poll Deleted.`, msg.id)
      this.emit('change.deletePoll', poll)
      return
    }
    this.emit('change.closePoll', poll)
    this.replyToMessage(`Poll closed. See ${poll.trello_card_shortUrl} for results`, msg.id)
  }

  listenToPollReply () {
    this.live_polls.forEach((id) => {
      this.bot.removeReplyListener(id)
    })
    this.live_polls = []
    this.getAllOpenPolls().forEach((poll) => {
      this.live_polls.push(this.bot.onReplyToMessage(poll.msg_chat_id, poll.msg_id, this.onNewVote.bind(this)))
    })
  }

  onNewVote (msg) {
    const poll = this.getPollFromReplyId(msg.reply_to_message.message_id)
    if (!poll) {
      this.replyToMessage('This poll is no longer active', msg.message_id)
      return
    }

    if (!poll.open) {
      this.replyToMessage(`This poll is closed. Link: ${poll.trello_card_shortUrl}`, msg.message_id)
      return
    }

    if (isNaN(msg.text) || parseInt(msg.text) < 1 || parseInt(msg.text) > poll.options.length) {
      this.replyToMessage(`Not a valid vote, reply with a number between: 1 - ${poll.options.length}`, msg.message_id)
      return
    }
    if (!poll.votes) {
      poll.votes = []
    }
    let votedIndex = _.findIndex(poll.votes, {voter_id: msg.from.id})
    if (votedIndex > -1) {
      poll.votes.splice(votedIndex, 1)
    }
    poll.votes.push({
      voter_id: msg.from.id,
      votes_name: msg.from.username,
      vote: msg.text,
      voted_at: +new Date()
    })
    poll.new_votes = true
    this.updatePoll(poll)
    this.loki.saveDatabase()
  }

  async onChangeChatMember () {
    let count
    const KEY = 'chat_member_count'
    try {
      count = await this.bot.getChatMembersCount(this.chatId)
    } catch (err) {
      console.log('ERR_TELEG_GET_MEMBER_COUNT')
    }
    let currentCount
    try {
      currentCount = await this.db_chat.findOne({id: KEY})
    } catch (err) {
      console.log('ERR_DB_GET_MEMBER_COUNT')
    }
    if (!this._run_changeChatMember) {
      currentCount = 'NA'
    }
    if ((currentCount && currentCount.count === count)) {
      return
    } else {
      this.db_chat.insert({
        id: KEY,
        count
      })
      this.loki.saveDatabase()
    }
    this._run_changeChatMember = true
    this.emit('change.memberCount', null, {count})
  }

  onNewPoll (msg, input) {
    const {text} = msg
    const cmd = text.split(/-[q|o]/)

    const question = cmd[1]
    const options = cmd.slice(2, cmd.length).map((op) => {
      return op.trim()
    })
    if (Object.keys(cmd).length === 1) {
      this.bot.sendMessage(msg.chat.id,
        `To create a new poll:
        -q <Question here>  -o <option 1> -o <option 2> (Max 5 options)
        Example :
        -q Who created Bitcoin? -o Satoshi -o Nick szabo -o Hal Finney
        `)
      this.bot.onReplyToMessage(msg.chat.id, msg.id)
      return
    }
    if (!question || options.length < MIN_OPTION_COUNT || options.length > MAX_OPTION_COUNT) {
      console.log('INVALID OPTIONS')
    }
    this.onClosePoll(msg)
    const data = {
      id: +new Date(),
      user_name: msg.from.username,
      user_id: msg.from.id,
      created: +new Date(),
      open: true,
      question,
      options
    }
    this.emit('new.poll', null, data, (err, trello) => {
      if (err) {
        console.log('FAILED TO CREATE NEW TRELLO CARD')
        return
      }
      data.trello_card_id = trello.id
      data.trello_card_idBoard = trello.idBoard
      data.trello_card_idList = trello.idList
      data.trello_card_shortUrl = trello.shortUrl
      this.db_polls.insert(data)
      this.loki.saveDatabase()
      this.askQuestion(msg, data)
    })
  }

  async askQuestion (msg, data) {
    const options = data.options.map((option, ix) => {
      return `${ix + 1}) ${option} \n`
    }).join('')
    let response = await this.bot.sendMessage(this.chatId,
      `@${data.user_name} Asks:

${data.question}
__________

${options}
__________
Trello card: ${data.trello_card_shortUrl}

Reply to this message to vote with the number of the option you are voting for
`)
    this.db_polls.findAndUpdate({id: data.id}, (poll) => {
      poll.msg_id = response.message_id
      poll.msg_chat_id = response.chat.id
      poll.updated_at = +new Date()
    })
    this.loki.saveDatabase()
    this.listenToPollReply()
  }
}

module.exports = Telegram
