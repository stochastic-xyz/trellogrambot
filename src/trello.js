
const NodeTrello = require('node-trello')
const eventEmitter = require('events').EventEmitter
const async = require('async')
const _ = require('lodash')
class Trello extends eventEmitter {
  constructor (params) {
    super()
    this.bot = new NodeTrello(params.key, params.token)
    this.board = params.board
    this.getListId()
  }

  getListId () {
    let lists = [this.board.poll_list_name]
    this.lists = {}
    this.bot.get(`/1/boards/${this.board.board_id}/lists/open`,
      (err, data) => {
        if (err) throw err

        lists.forEach((list) => {
          this.lists[list] = _.find(data, {name: list})
        })
      })
  }

  updateMemberCount (MEMBER_COUNT) {
    this.bot.put(`/1/cards/${this.board.member_count_id}`,
      {name: `Telegram Group Member Count: ${MEMBER_COUNT}`},
      (err, data) => {
        if (err) throw err
        console.log('UPDATED MEMBERS COUNT')
      })
  }

  updateOneCard (poll, cb) {
    let description = this.getPollDescription(poll)
    let name = this.getPollName(poll)
    this.updateCard(poll.trello_card_id, {
      desc: description,
      name,
      pos: 'top'
    }, cb)
  }

  updatePollCards (polls) {
    async.each(polls, (poll, cb) => {
      this.updateOneCard(poll, cb)
    }, (err, data) => {
      if (err) {
        console.log('ERR_UPDATING_TRELLO_CARD')
        console.log(err)
      }
    })
  }

  deletePollCard (poll) {
    this.bot.del(`/1/cards/${poll.trello_card_id}`, (err, data) => {
      if (!err) {
        console.log('DELETED POLL CARD')
      }
    })
  }

  createNewCard (card, cb) {
    this.bot.post(`/1/cards/`, card, cb)
  }

  updateCard (id, card, cb) {
    this.bot.put(`/1/cards/${id}`, card, (err, data) => {
      if (!err) {
        console.log('UPDATED POLL CARD')
      }
    })
  }
  getPollName (data) {
    return `${data.question} ${!data.open ? '✅' : ''}`
  }
  getPollDescription (data) {
    let totalCount = data.tally ? data.tally.total_count : `0`
    const options = data.options.map((option, ix) => {
      let count = ''
      let percentage = ''
      if (data.tally) {
        percentage = data.tally.percentage[ix] + '%'
        count = data.tally.count[ix]
      }
      return `${ix + 1}) ${option}   -   ${count}   (${percentage})  \n`
    }).join('')

    return `
### ${data.question}
-----
${options}

Total Votes : ${totalCount}


-----
Asked by: ${data.user_name}
Created on: ${new Date(data.created).toDateString()}

${!data.open ? '#### This Poll is closed' : ''}
      `
  }

  addNewPoll (data, cb) {
    let card = {
      name: this.getPollName(data),
      desc: this.getPollDescription(data),
      pos: 'top',
      idList: this.lists[this.board.poll_list_name].id,
      keepFromSource: 'all' }
    this.createNewCard(card, cb)
  }
}

module.exports = Trello
