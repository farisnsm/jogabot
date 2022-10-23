const TelegramBot = require('node-telegram-bot-api');
const token = '835638437:AAGmC_LDy_DmbRTxbIFkW_zC8A57LBc3gek';
var moment = require('moment');
const bot = new TelegramBot(token, { polling: true });
var mysql = require('mysql2');

var connection = mysql.createPool({
  connectionLimit: 100,
  host: 'eu-cdbr-west-03.cleardb.net',
  user: 'be0dbc49587e53',
  password: 'f7a660f5',
  database: 'heroku_722cb8a7f7c7056',
  multipleStatements: true
});

let rating = {}

function cancelTimeout() {
  connection.query('select 1', function (error, results, fields) {
    if (error) { console.log(error) } else { console.log(moment().format()) }
  })
  setTimeout(cancelTimeout, 1000 * 60 * 60);
}
cancelTimeout()

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}


// Matches "/echo [whatever]"
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  let text = msg.text
  //console.log(msg)
  if (msg.from.id = '200418207' && msg.text.substring(0, 10) == 'create new') {
    bot.sendMessage(chatId, 'Creating new session: ' + msg.text.substring(11));
    var options = {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [{ text: 'Ok Go - 1', callback_data: '-1' }, { text: 'Ok Go + 1', callback_data: '1' }]
        ]
      })
    };
    bot.sendMessage(chatId, "Sooker on " + msg.text.substring(11), options);
  }

  if (msg.from.id = '200418207' && msg.text.substring(0, 12) == 'create teams') {
    let date = msg.text.substring(13)
    //console.log(date)
    connection.query('select * from attendance where date = "' + date + '" order by userId', function (error, results, fields) {
      shuffleArray(results)
      let teamA = ""
      let teamB = ""
      let teamC = ""
      let i = 0
      results.forEach(row2 => {
        i++
        if (i % 3 == 0) {
          teamA = teamA + row2.name + "\n"
        } else if (i % 2 == 0) {
          teamB = teamB + row2.name + "\n"
        } else {
          teamC = teamC + row2.name + "\n"
        }
      })
      let res = teamA + "-------------\n" + teamB + "-------------\n" + teamC
      var options = {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [{ text: 'Shuffle Teams', callback_data: 's' }]
          ]
        })
      };
      bot.sendMessage(chatId, 'Creating teams for ' + date + "\nVotes to shuffle: 0\nNeed 4 votes to shuffle\n---------\n" + res, options);
    });

  }

  if (text == "/rating") {
    if(msg.chat.type != 'private'){
      bot.sendMessage(msg.chat.id,"/rating only works in a DM with the bot, go to t.me/joga_bot to give ratings")
    } else {
      connection.query("select * from attendance a left join ranking r on r.telegramID = '"+chatId+"' and r.telegramID2 = a.userId where userId != 'x' group by userId order by rank desc", function (error, results, fields) {
        if (error) { console.log(error) } else {
          let players = []
          let temp = []
          results.forEach(r=>{
            temp.push({ text: r.name + " (" + (r.rank ? r.rank : 0) + ")", callback_data: 'vote_' + r.userId + "_" + r.name })
            if(temp.length == 3){
              players.push(temp)
              temp = []
            }
          })
          players.push(temp)
          var options = {
            reply_markup: JSON.stringify({
              inline_keyboard: players
            })
          };
          bot.sendMessage(msg.chat.id, "Who's rating do you want to give?\nYour current ratings for them is displayed beside their names", options)
        }
      })
    }
  }

  if (rating.hasOwnProperty(chatId)){
    if(isNaN(text) || text < 0 || text > 10){
      bot.sendMessage(chatId, "Invalid input. Rating aborted")
      delete rating[chatId]
    } else {
      connection.query("insert into ranking values ('"+chatId+rating[chatId].userId+"','"+chatId+"','"+rating[chatId].userId+"','"+text+"') on duplicate key update rank = "+text, function (error, results, fields) {
        if (error) { console.log(error) } else {
          bot.sendMessage(chatId,"You have succesfully updated your rating for " + rating[chatId].userName+"\nType or Tap /rating to provide another")
          delete rating[chatId]
        }
      })
    }
    
  }
});

bot.on('callback_query', function onCallbackQuery(callbackQuery) {
  //console.log(callbackQuery.message.text.substring(10))

  const action = callbackQuery.data;
  let actions = action.split("_")
  const msg = callbackQuery.message;
  let responder = callbackQuery.from.id
  let responderName = callbackQuery.from.first_name
  console.log(responderName, moment().format(), action)
  let date = msg.text.substring(10, 20)
  let text = "Sooker on " + date + "\n8.30PM at Orto, Yishun\n-----------------"
  const opts = {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: 'Ok Go - 1', callback_data: '-1' }, { text: 'Ok Go + 1', callback_data: '1' }]
      ]
    })
  };
  var options = {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: 'Ok Go - 1', callback_data: '-1' }, { text: 'Ok Go + 1', callback_data: '1' }]
      ]
    })
  };
  function respond(sDate) {
    connection.query('select * from attendance where date = "' + sDate + '" order by userId', function (error, results, fields) {
      if (error) throw error;
      let i = 0
      results.forEach(row2 => {
        i++
        text = text + "\n" + i + ": " + row2.name
      })
      bot.deleteMessage(opts.chat_id, opts.message_id)
      bot.sendMessage(opts.chat_id, text, options);
    });
  }

  if (actions[0] == 'vote') {

    rating[responder] = {userName:actions[2],userId:actions[1]}
    bot.sendMessage(responder, "Please provide a rating for " + actions[2] + " from 0 (worst) to 10 (best)")
    bot.deleteMessage(opts.chat_id, opts.message_id)
  } else {
    let count = 0
    connection.query("select * from attendance where date = '" + date + "' and userId = '" + responder + "'", function (error, results, fields) {
      if (error) throw error;
      count = results.length
      if (count >= 1) {
        responderName = responderName + " friend " + count
      }

      if (action == '1') {
        connection.query("insert into attendance values ('" + date + "','" + responder + "','" + responderName + "',0)", function (error, results, fields) {
          if (error) throw error;
          respond(date)
        });
      }
      if (action == '-1') {
        connection.query("delete from attendance where userId='" + responder + "' ORDER BY id DESC LIMIT 1", function (error, results, fields) {
          if (error) throw error;
          respond(date)
        });
      }
      if (action == 's') {
        date = msg.text.substring(19, 29)
        connection.query("select * from teams where date = '" + date + "' and shuffle = '" + responder + "'", function (e, r, f) {
          if (r.length == 0) {
            connection.query("insert into teams values ('" + date + "','" + responder + "');select * from teams where date = '" + date + "' group by shuffle", function (error, results, fields) {
              if (error) throw error;
              bot.deleteMessage(opts.chat_id, opts.message_id)
              let shuffleCount = results[1].length
              //console.log(shuffleCount)
              if (shuffleCount <= 3) {
                let respText = "Creating teams for " + date + "\nVotes to shuffle: " + shuffleCount + "\nNeed 4 votes to shuffle" + msg.text.split('Need 4 votes to shuffle')[1]
                var options = {
                  reply_markup: JSON.stringify({
                    inline_keyboard: [
                      [{ text: 'Shuffle Teams', callback_data: 's' }]
                    ]
                  })
                };
                bot.sendMessage(opts.chat_id, respText, options);
              } else {
                //console.log(0)
                connection.query('delete from teams where date = "' + date + '";select * from attendance where date = "' + date + '" order by userId', function (error, results, fields) {
                  let arr = results[1]
                  let teamA = ""
                  let teamB = ""
                  let teamC = ""
                  let i = 0
                  shuffleArray(arr)
                  arr.forEach(row2 => {
                    i++
                    if (i % 3 == 0) {
                      teamA = teamA + row2.name + "\n"
                    } else if (i % 2 == 0) {
                      teamB = teamB + row2.name + "\n"
                    } else {
                      teamC = teamC + row2.name + "\n"
                    }
                  })
                  let res = teamA + "-------------\n" + teamB + "-------------\n" + teamC
                  var options = {
                    reply_markup: JSON.stringify({
                      inline_keyboard: [
                        [{ text: 'Shuffle Teams', callback_data: 's' }]
                      ]
                    })
                  };
                  bot.sendMessage(opts.chat_id, 'Creating teams for ' + date + "\nVotes to shuffle: 0\nNeed 4 votes to shuffle\n---------\n" + res, options);
                });
              }
            });
          }
        })
      }
    });
  }

  //delete from UserLoginTable where UserId=2 ORDER BY UserLoginDateTime DESC LIMIT 1

});