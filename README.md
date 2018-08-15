# TrelloGramBot

A bot for interacting with Trello boards from Telegram.

This bot was developed to be run on the Lightning makers Telegram chat group, but you can run this bot anywhere.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine.


### Prerequisites

* Latest version of Node.js
* [Telegram bot](https://core.telegram.org/bots)
* [Trello Board](https://trello.com)

### Installing


Download or clone this git repo

When in folder run:
```
npm install
touch ./db/chat_data.json //Creates DB file
```

Set access and tokens in the `config.json`


#### Set board config

```
"board":{
    "member_count_id":"0835BtzX" // Trello card that displays number of users in Telegram group,
    "board_id":"fi2B3Qds"//Id of the trello board,
    "poll_list_name": "Poll" // Name of card that will display polls
}
```

**Note:** Any changes to the trello board will require the bot to restart

#### Running the bot
To run the bot simply run:
```
node index.js
```

#### Getting Telegram Chat Id

To get your `telegram_chat_id`
1) Start running the bot
2) Add the bot to the group.
3) Run `/ping`

Your chat id will be set and the chat id of that group will be displayed in the terminal.

You can copy and paste that value in the `config.json` for `telegram_chat_id` so you don't have to run ping every time the bot is restarted.

**Note:** The bot will not respond to anything before the `telegram_chat_id` is set

#### Telegram commands

`/newpoll`: Creates a new poll
```
/newpoll@ln_maker_trello_bot -q How old is Bitcoin? -o 1 year -o 4 year -o other
```
**Note:** If you have an exisiting poll, it will be closed/deleted,

**Voting on a poll:**

Simply reply to the poll response of the bot with the number you are voting for.

You will only get a response If there was an error voting for the poll.

`/closepoll`: This will close your running poll. If you have no votes, the poll is deleted from the trello board.

`/ping`: Set the chat id for the bot, if no chat id has been set.


#### Telegram events


`onChangeChatMember`: When a user enters or leaves the group the Trello card is updated

## Running the tests

TODO


## Built With

* [lokijs](http://lokijs.org/) - A fast, in-memory document-oriented datastore for node.js, browser and cordova
* [node-telegram-bot](https://github.com/yagop/node-telegram-bot-api) - Telegram Bot Libary
* [node-trello](https://github.com/adunkman/node-trello) - Trello Bot Libary


## Authors

* **rbndg** - Twitter: [@r32a](https://twitter.com/r32a_)

## License

This project is licensed under the MIT License

## Acknowledgments

This bot was developed to be run on the Lightning makers Telegram chat group:
https://medium.com/@TheCarter/announcing-lightning-makers-b7fa9ccdfcb5


## Donate

Bitcoin : [3PaWXAdfqto7tjooPk25nscB3gEVNXKYsu](https://www.blockchain.com/btc/address/3PaWXAdfqto7tjooPk25nscB3gEVNXKYsu)