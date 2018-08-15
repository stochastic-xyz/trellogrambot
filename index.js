const Telegram = require('./src/telegram')
const Trello = require('./src/Trello')
const config = require('./config.json')

const telegram = new Telegram({
  key: config.telegram_key,
  chat_id: config.telegram_chat_id
})

const trello = new Trello({
  token: config.trello_token,
  key: config.trello_key,
  board: config.board
})

telegram.on('change.memberCount', (err, data) => {
  if (!err) {
    trello.updateMemberCount(data.count)
  }
})
telegram.on('new.poll', (err, data, cb) => {
  if (!err) {
    trello.addNewPoll(data, cb)
  }
})
telegram.on('change.tally', (polls) => {
  trello.updatePollCards(polls)
})
telegram.on('change.closePoll', (poll) => {
  trello.updateOneCard(poll)
})
telegram.on('change.deletePoll', (poll) => {
  trello.deletePollCard(poll)
})
