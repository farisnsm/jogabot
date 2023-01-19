const TelegramBot = require('node-telegram-bot-api');
const token = '835638437:AAGmC_LDy_DmbRTxbIFkW_zC8A57LBc3gek'; //prod
//const token = '5764854026:AAGjK2oDy_NZaEaO4JzDrU2LaeOw5pBq3F4' // dev
var moment = require('moment');
const bot = new TelegramBot(token, { polling: true });
var mysql = require('mysql2');
const fs = require('fs');

var connection = mysql.createPool({
  connectionLimit: 100,
  host: 'eu-cdbr-west-03.cleardb.net',
  user: 'be0dbc49587e53',
  password: 'f7a660f5',
  database: 'heroku_722cb8a7f7c7056',
  multipleStatements: true
});

let rating = {}
let addFriend = {}
var latestList = require('./latestList.json')
console.log(latestList)
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

function random() {
  return Math.random() * (1.05 - 0.95) + 0.95;
}


function ratingQuery(sessionDate) {
  return ("SELECT *,avg(rank) avg FROM heroku_722cb8a7f7c7056.ranking r left join attendance a on a.userId = r.telegramID2 where telegramID2 in (select userId from attendance where date = '" + sessionDate + "') and telegramID in (select userId from attendance where date = '" + sessionDate + "') group by userId order by avg")
}
// Matches "/echo [whatever]"
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  console.log(msg)
  let text = msg.text
  //console.log(msg)
  if (msg.text.substring(0, 10) == 'create new') {
    bot.sendMessage(chatId, 'Creating new session: ' + msg.text.substring(11));
    var options = {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [{ text: 'Ok Go - 1', callback_data: '-1' }, { text: 'Ok Go + 1', callback_data: '1' }]
        ]
      })
    };
    Promise.all([bot.sendMessage(chatId, "Sooker on " + msg.text.substring(11), options)]).then(results => {
      latestList[msg.text.substring(11)] = { chatId: results[0].chat.id, messageId: results[0].message_id }
      fs.writeFileSync('latestList.json', JSON.stringify(latestList));
    })
  }

  if (msg.text.substring(0, 12) == 'create teams') {
    let date = msg.text.substring(13)
    //console.log(date)
    connection.query(ratingQuery(date), function (error, results, fields) {
      let arr = results.map(r => ({ name: r.name, v: r.avg * random() }))
      arr.sort((a, b) => a.v - b.v);
      let b = []
      let l = arr.length - 1
      let L = l / 2;
      for (var i = 0; i < L; i++) b.push(arr[l - i], arr[i]);
      if (arr.length % 2) b.push(arr[i]);
      let teams = [
        { n: 'A', s: { a: 0, p: [] } },
        { n: 'B', s: { a: 0, p: [] } },
        { n: 'C', s: { a: 0, p: [] } }
      ]
      let alt = true
      b.forEach(r => {
        if (alt) {
          //good players
          teams.sort((a, b) => (a.s.a - b.s.a) * ((5 - a.s.p.length) / (5 - a.s.p.length))) //get worst team
          teams[0].s.p.push(r.name)
          teams[0].s.a = ((teams[0].s.a * (teams[0].s.p.length - 1)) + r.v) / (teams[0].s.p.length)

        } else {
          teams.sort((a, b) => (b.s.a - a.s.a) * ((5 - a.s.p.length) / (5 - a.s.p.length))) //get best team
          teams[0].s.p.push(r.name)
          teams[0].s.a = ((teams[0].s.a * (teams[0].s.p.length - 1)) + r.v) / (teams[0].s.p.length)
        }
        alt = !alt

      })
      let msg = "Teams for " + date
      teams.sort((a, b) => a.n.charCodeAt(0) - b.n.charCodeAt(0)).forEach(t => {
        msg = msg + "\n-------------\nTeam " + t.n + "\nAvg Score: " + t.s.a.toFixed(2) + "\n" + t.s.p.join("\n")
      })
      bot.sendMessage(chatId, msg + "\n\nDisclaimer:\nThis shit is still in the works.\nFriends are left out for now.\nThe teams may end up uneven but the average scores of the teams are as close as mathematically possible.\nShuffling Disabled")
    })
    // connection.query('select * from attendance where date = "' + date + '" order by userId', function (error, results, fields) {
    //   shuffleArray(results)
    //   let teamA = ""
    //   let teamB = ""
    //   let teamC = ""
    //   let i = 0
    //   results.forEach(row2 => {
    //     i++
    //     if (i % 3 == 0) {
    //       teamA = teamA + row2.name + "\n"
    //     } else if (i % 2 == 0) {
    //       teamB = teamB + row2.name + "\n"
    //     } else {
    //       teamC = teamC + row2.name + "\n"
    //     }
    //   })
    //   let res = teamA + "-------------\n" + teamB + "-------------\n" + teamC
    //   var options = {
    //     reply_markup: JSON.stringify({
    //       inline_keyboard: [
    //         [{ text: 'Shuffle Teams', callback_data: 's' }]
    //       ]
    //     })
    //   };
    //   bot.sendMessage(chatId, 'Creating teams for ' + date + "\nVotes to shuffle: 0\nNeed 4 votes to shuffle\n---------\n" + res, options);
    // });

  }

  if (text == '/rating@joga_bot') {
    bot.sendMessage(msg.chat.id, "/rating only works in a DM with the bot, go to t.me/joga_bot to give ratings")
  }

  if (msg.chat.type == 'private' && text == '/start') {
    connection.query("select * from attendance a left join ranking r on r.telegramID = '" + chatId + "' and r.telegramID2 = a.userId where userId != 'x' group by userId order by rank desc", function (error, results, fields) {
      if (error) { console.log(error) } else {
        let players = []
        let temp = []
        results.forEach(r => {
          temp.push({ text: r.name + " (" + (r.rank ? r.rank : 0) + ")", callback_data: 'vote_' + r.userId + "_" + r.name })
          if (temp.length == 3) {
            players.push(temp)
            temp = []
          }
        })
        players.push(temp)
        var options3 = {
          reply_markup: JSON.stringify({
            inline_keyboard: players
          })
        };
        bot.sendMessage(msg.chat.id, "Who's rating do you want to give?\nYour current ratings for them is displayed beside their names", options3)
      }
    })
  }

  if (text == "/rating") {
    if (msg.chat.type != 'private') {
      bot.sendMessage(msg.chat.id, "/rating only works in a DM with the bot, go to t.me/joga_bot to give ratings")
    } else {
      connection.query("select * from attendance a left join ranking r on r.telegramID = '" + chatId + "' and r.telegramID2 = a.userId where (friendId is NULL or friendId = '" + chatId + "') and userId != 'x' group by userId order by rank desc", function (error, results, fields) {
        if (error) { console.log(error) } else {
          let players = []
          let temp = []
          results.forEach(r => {
            temp.push({ text: "(" + (r.rank ? r.rank : 0) + ") " + r.name.split(" (")[0], callback_data: 'vote_' + r.userId + "_" + r.name })
            if (temp.length == 3) {
              players.push(temp)
              temp = []
            }
          })
          players.push(temp)
          var options4 = {
            reply_markup: JSON.stringify({
              inline_keyboard: players
            })
          };
          bot.sendMessage(msg.chat.id, "Who's rating do you want to give?\nYour current ratings for them is displayed beside their names", options4)
        }
      })
    }
  }

  if (addFriend.hasOwnProperty(chatId)) {
    if (!text.includes("/")) {
      console.log(chatId)
      bot.sendMessage(chatId, "Invalid input. Registration aborted")
      delete addFriend[chatId]
    } else {
      let friendRating = text.split("/")[1].trim()
      let friendName = text.split("/")[0].trim() + " (" + msg.from.first_name + ")"
      let friendId = Math.random() * (99999999 - 10000000) + 10000000
      friendId = Math.round(friendId)
      if (isNaN(friendRating) || friendRating < 0 || friendRating > 10 || friendName.length == 0) {
        bot.sendMessage(chatId, "Invalid input. Registration aborted")
        delete addFriend[chatId]
      } else {
        connection.query("insert into ranking values ('" + chatId + friendId + "','" + chatId + "','" + friendId + "','" + friendRating + "')", function (error, results, fields) {
          connection.query("insert into attendance values ('" + addFriend[chatId].sdate + "','" + friendId + "','" + friendName + "',0,'" + chatId + "')", function (error, results, fields) {
            if (error) throw error;
            connection.query('select * from attendance where date = "' + addFriend[chatId].sdate + '" order by userId', function (error, results2, fields) {
              if (error) throw error;
              let text2 = "Sooker on " + addFriend[chatId].sdate + "\n8.30PM at Orto, Yishun\n-----------------"
              let i = 0
              results2.forEach(row2 => {
                i++
                text2 = text2 + "\n" + i + ": " + row2.name
              })
              let options5 = {
                reply_markup: JSON.stringify({
                  inline_keyboard: [
                    [{ text: 'Ok Go - 1', callback_data: '-1' }, { text: 'Ok Go + 1', callback_data: '1' }]
                  ]
                })
              };
              bot.sendMessage(chatId, "Registration successful")

              //bot.sendMessage(addFriend[chatId].chatID, text2, options);

              bot.deleteMessage(latestList[addFriend[chatId].sdate].chatId, latestList[addFriend[chatId].sdate].messageId)
              
              Promise.all([bot.sendMessage(addFriend[chatId].chatID, text2, options5)]).then(results => {
                latestList[addFriend[chatId].sdate] = { chatId: results[0].chat.id, messageId: results[0].message_id }
                fs.writeFileSync('latestList.json', JSON.stringify(latestList));
                delete addFriend[chatId]
              })
              
            });
          });
        })
      }
    }

  }

  if (rating.hasOwnProperty(chatId)) {
    if (isNaN(text) || text < 0 || text > 10) {
      bot.sendMessage(chatId, "Invalid input. Rating aborted")
      delete rating[chatId]
    } else {
      connection.query("insert into ranking values ('" + chatId + rating[chatId].userId + "','" + chatId + "','" + rating[chatId].userId + "','" + text + "') on duplicate key update rank = " + text, function (error, results, fields) {
        if (error) { console.log(error) } else {
          bot.sendMessage(chatId, "You have succesfully updated your rating for " + rating[chatId].userName + "\nType or Tap /rating to provide another")
          delete rating[chatId]
        }
      })
    }

  }
});

bot.on('callback_query', function onCallbackQuery(callbackQuery) {
  //console.log(callbackQuery.message.text.substring(10))
  isFriend = false
  const action = callbackQuery.data;
  let actions = action.split("_")
  const msg = callbackQuery.message;
  let responder = callbackQuery.from.id
  let responderName = callbackQuery.from.first_name
  console.log(responderName, moment().format(), action)
  let date = msg.text.substring(10, 20)
  let text = "Sooker on " + date + "\n8.30PM at Orto, Yishun\n-----------------"
  let query = "SELECT round(avg(rank),2) as r FROM heroku_722cb8a7f7c7056.ranking where telegramID2 = '" + responder + "'"
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
      bot.deleteMessage(latestList[sDate].chatId, latestList[sDate].messageId)

      Promise.all([bot.sendMessage(opts.chat_id, text, options)]).then(results => {
        latestList[sDate] = { chatId: results[0].chat.id, messageId: results[0].message_id }
        fs.writeFileSync('latestList.json', JSON.stringify(latestList));
      })
    });
  }

  if (actions[0] == 'vote') {

    rating[responder] = { userName: actions[2], userId: actions[1] }
    
    connection.query(query, function (error, results, fields) {
      if (error) throw (error);
      bot.sendMessage(responder, "Please provide a rating for " + actions[2] + " from 0 (worst) to 10 (best)\n\nFor reference, your average rating is " + results[0].r)
      bot.deleteMessage(opts.chat_id, opts.message_id)
    })

  } else {
    let count = 0
    connection.query("select * from attendance where date = '" + date + "' and (userId = '" + responder + "' or friendId = '" + responder + "')", function (error, results, fields) {

      if (error) throw error;
      count = results.length


      if (count == 0 && action == '1') {
        connection.query("insert into attendance values ('" + date + "','" + responder + "','" + responderName + "',0,NULL)", function (error, results, fields) {
          if (error) throw error;
          respond(date)
        });
      }
      if (count <= 1 && action == '-1') {
        connection.query("delete from attendance where userId='" + responder + "' ORDER BY id DESC LIMIT 1", function (error, results, fields) {
          if (error) throw error;
          respond(date)
        });
      }

      if (action == '1' && count >= 1) {
        connection.query("select * from attendance where friendId = '" + responder + "' and date != '" + date + "' and userId not in (select userId from attendance where date = '" + date + "') group by userId", function (error, results, fields) {
          if (results.length == 0) {

            connection.query(query, function (error, results, fields) {
              if (error) throw (error);
              bot.sendMessage(responder, "You dont have any friends registed or all your friends are already added into that day's session. Beginning registration of a new friend...\n\nPlease key in your friends name and give them a rating(0 to 10) in the following format\nFriends Name / Rating\n\nFor reference, your average rating is " + results[0].r)
              addFriend[responder] = { sdate: date, chatID: opts.chat_id, messageID: opts.message_id }
              bot.answerCallbackQuery(callbackQuery.id, { text: "Check your DM's with the bot, " + responderName })
            })


          } else {
            let friendsArr = [[{ text: "Add New Friend", callback_data: 'anf_' + opts.chat_id + '_' + opts.message_id + '_' + date }], [{ text: "Cancel", callback_data: "cancel" }]]
            results.forEach(r => {
              friendsArr.unshift([{ text: r.name.split(" (" + responderName + ")").join(""), callback_data: 'af_' + r.name + '_' + r.userId + '_' + opts.chat_id + '_' + opts.message_id + '_' + date }])
            })
            var options2 = {
              reply_markup: JSON.stringify({
                inline_keyboard: friendsArr
              })
            };
            bot.sendMessage(responder, "Which friend would you like to add?", options2)
            bot.answerCallbackQuery(callbackQuery.id, { text: "Check your DM's with the bot, " + responderName })
          }
        })
      }
      if (action == -1 && count >= 2) {
        let friendsArr = [[{ text: "Cancel", callback_data: "cancel" }]]
        results.filter(r => r.userId != responder).forEach(r => {
          friendsArr.unshift([{ text: r.name.split(" (" + responderName + ")").join(""), callback_data: "rf_" + date + "_" + r.id }])
        })
        var options6 = {
          reply_markup: JSON.stringify({
            inline_keyboard: friendsArr
          })
        };
        bot.sendMessage(responder, "Which friend would you like to remove?", options6)
        bot.answerCallbackQuery(callbackQuery.id, { text: "Check your DM's with the bot, " + responderName })

      }

      if (actions[0] == 'rf') {
        connection.query("update attendance set date = '99-99-9999' where id = " + actions[2], function (error, results, fields) {
          if (error) throw error;
          connection.query('select * from attendance where date = "' + actions[1] + '" order by userId', function (error, results, fields) {
            if (error) throw error;
            let text3 = "Sooker on " + actions[1] + "\n8.30PM at Orto, Yishun\n-----------------"
            let i = 0
            results.forEach(row2 => {
              i++
              text3 = text3 + "\n" + i + ": " + row2.name
            })
            bot.deleteMessage(opts.chat_id, opts.message_id)

            //bot.deleteMessage(actions[3], actions[4])


            bot.deleteMessage(latestList[actions[1]].chatId, latestList[actions[1]].messageId)

            Promise.all([bot.sendMessage(latestList[actions[1]].chatId, text3, options)]).then(results => {
              latestList[actions[5]] = { chatId: results[0].chat.id, messageId: results[0].message_id }
              fs.writeFileSync('latestList.json', JSON.stringify(latestList));
            })
          });
        });
      }

      if (actions[0] == "anf") {
        let query = "SELECT round(avg(rank),2) as r FROM heroku_722cb8a7f7c7056.ranking where telegramID2 = '" + responder + "'"
        connection.query(query, function (error, results, fields) {
          if (error) throw (error);
          bot.sendMessage(responder, "Beginning registration of a new friend...\n\nPlease key in your friends name and give them a rating(0 to 10) in the following format\nFriends Name / Rating\n\nFor reference, your average rating is " + results[0].r)
          addFriend[responder] = { sdate: actions[3], chatID: actions[1], messageID: actions[2] }
          bot.deleteMessage(opts.chat_id, opts.message_id)
        })

      }

      if (actions[0] == 'af') {
        connection.query("insert into attendance values ('" + actions[5] + "','" + actions[2] + "','" + actions[1] + "',0,'" + responder + "')", function (error, results, fields) {
          if (error) throw error;
          connection.query('select * from attendance where date = "' + actions[5] + '" order by userId', function (error, results, fields) {
            if (error) throw error;
            let text3 = "Sooker on " + actions[5] + "\n8.30PM at Orto, Yishun\n-----------------"
            let i = 0
            results.forEach(row2 => {
              i++
              text3 = text3 + "\n" + i + ": " + row2.name
            })
            bot.deleteMessage(opts.chat_id, opts.message_id)

            //bot.deleteMessage(actions[3], actions[4])


            bot.deleteMessage(latestList[actions[5]].chatId, latestList[actions[5]].messageId)

            Promise.all([bot.sendMessage(actions[3], text3, options)]).then(results => {
              latestList[actions[5]] = { chatId: results[0].chat.id, messageId: results[0].message_id }
              fs.writeFileSync('latestList.json', JSON.stringify(latestList));
            })
          });
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
      if (action == 'cancel') {
        bot.deleteMessage(opts.chat_id, opts.message_id)
      }
    });
  }

  //delete from UserLoginTable where UserId=2 ORDER BY UserLoginDateTime DESC LIMIT 1

});