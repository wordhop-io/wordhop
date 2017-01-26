'use strict';

var rp = require('minimal-request-promise');
var io = require('socket.io-client');

function WordhopBot(apiKey, serverRoot, path, socketServer, clientkey, token, useWebhook, debug) {
  var that = Object;
  that.useWebhook = useWebhook;
  if (useWebhook === false) {
    var socket = io.connect(socketServer);
    that.emit = function (event, message) {
      socket.emit(event, message);
    }

    socket.on('connect', function (message) {
      that.trigger('connect');
    });

    socket.on('socket_id_set', function (socket_id) {
      that.setSocketId(socket_id);
      var data = {
        method: 'POST',
        hostname: that.serverRoot,
        port: 443,
        path: that.path + 'update_bot_socket_id',
        headers: {
          'Content-Type': 'application/json',
          'apikey': that.apiKey,
          'clientkey': that.clientkey,
          'type': 'connect'
        },
        body: JSON.stringify({'socket_id': socket_id})
      };
      that.trigger('socket_id_set');
      rp(data);
    });

    socket.on('chat response', function (msg) {
      var event = 'chat response';
      that.trigger(event, [msg]);
    });

    socket.on('failure log', function (msg) {
      var event = 'failure log';
      that.trigger(event, [msg]);
    });

    socket.on('chat message', function (msg) {
      var event = 'chat message';
      that.trigger(event, [msg]);
    });

    socket.on('bot message', function (msg) {
      var event = 'bot message';
      that.trigger(event, [msg]);
    });

    socket.on('engage users', function (msg) {
      var event = 'engage users';
      that.trigger(event, [msg]);
    });

    socket.on('inactive channels message', function (msg) {
      var event = 'inactive channels message';
      that.trigger(event, [msg]);
    });

    socket.on('resumed channels message', function (msg) {
      var event = 'resumed channels message';
      that.trigger(event, [msg]);
    });

    socket.on('live chat request message', function (msg) {
      var event = 'live chat request message';
      that.trigger(event, [msg]);
    });

    that.trigger = function (event, data) {
      if (debug) {
        console.log('handler:', event);
      }
      if (that.events[event]) {
        for (var e = 0; e < that.events[event].length; e++) {

          var res = that
            .events[event][e]
            .apply(that, data);
          if (res === false) {
            return;
          }
        }
      } else if (debug) {
        console.log('No handler for', event);
      }
    };

    that.on = function (event, cb) {
      var events = (typeof(event) == 'string')
        ? event.split(/\,/g)
        : event;
      for (var e in events) {
        if (!that.events[events[e]]) {
          that.events[events[e]] = [];
        }
        that
          .events[events[e]]
          .push(cb);
      }
      return that;
    };

    that.getSocketId = function () {
      return that.socketId;
    }

    that.setSocketId = function (socketId) {
      that.socketId = socketId;
    }
  }
  that.apiKey = apiKey;
  that.serverRoot = serverRoot;
  that.path = path;
  that.debug = debug;
  that.clientkey = clientkey;
  that.token = token;
  that.events = {};

  that.checkIfMessage = function (msg) {
    var message = msg;
    if (message.entry) {
      if (message.entry[0].messaging) {
        var facebook_message = message.entry[0].messaging[0];
        if (facebook_message.message || facebook_message.postback) {
          return true;
        }
      }
    }
    if (message.postback) {
      return true;
    }
    if (msg.message) {
      message = msg.message;
    }
    if (msg.sourceEvent) {
      var slackMessage = msg.sourceEvent.SlackMessage;
      if (slackMessage) {
        message = slackMessage;
      } else if (msg.source == "facebook") {
        if (msg.sourceEvent.message) {
          return true;
        }
      }
    }
    if (message.text == null) {
      message.text = "";
    }
    if ((message.type === 'user_message' || message.type === 'message' || message.type === 'facebook_postback' || message.type == null || message.page) && message.transcript == null && (message.subtype == null || message.subtype === "file_share") && message.hasOwnProperty("reply_to") == false && message.is_echo == null && message.bot_id == null && (message.text.length > 0 || message.attachments != null || message.attachment != null)) {
      return true;
    } else {
      return false;
    }
  }

  that.logUnkownIntent = function (message) {
    if (that.checkIfMessage(message) == false) {
      return;
    }
    var data = {
      method: 'POST',
      hostname: that.serverRoot,
      port: 443,
      path: that.path + 'unknown',
      headers: {
        'Content-Type': 'application/json',
        'apikey': that.apiKey,
        'platform': that.platform,
        'clientkey': that.clientkey,
        'failure': true,
        'type': 'unknown'
      },
      body: JSON.stringify(message)
    };
    return rp(data);
  }

  that.assistanceRequested = function (message) {
    if (that.checkIfMessage(message) == false) {
      return Promise.resolve();
    }
    var data = {
      method: 'POST',
      hostname: that.serverRoot,
      port: 443,
      path: that.path + 'human',
      headers: {
        'Content-Type': 'application/json',
        'apikey': that.apiKey,
        'platform': that.platform,
        'clientkey': that.clientkey
      },
      body: JSON.stringify(message)
    };
    return rp(data);
  }

  that.hopIn = function (message) {
    if (that.checkIfMessage(message) == false) {
      return Promise.resolve();
    }
    var data = {
      method: 'POST',
      hostname: that.serverRoot,
      port: 443,
      path: that.path + 'in',
      headers: {
        'Content-Type': 'application/json',
        'apikey': that.apiKey,
        'platform': that.platform,
        'clientkey': that.clientkey,
        'type': 'in'
      },
      body: JSON.stringify(message)
    };
    if (useWebhook === false) {
      data.headers.socket_id = that.getSocketId();
    }
    if (that.token != "") {
      data.headers.token = that.token;
    }
    return rp(data);
  }

  that.hopOut = function (message) {
    if (that.checkIfMessage(message) == false) {
      return Promise.resolve();
    }
    var data = {
      method: 'POST',
      hostname: that.serverRoot,
      port: 443,
      path: that.path + 'out',
      headers: {
        'Content-Type': 'application/json',
        'apikey': that.apiKey,
        'platform': that.platform,
        'clientkey': that.clientkey,
        'type': 'out'
      },
      body: JSON.stringify(message)
    };
    if (useWebhook === false) {
      data.headers.socket_id = that.getSocketId();
    }

    return rp(data);
  }

  that.checkForPaused = function (channel, cb) {
    var headers = {
      'Content-Type': 'application/json',
      'apikey': that.apiKey,
      'clientkey': that.clientkey,
      'type': 'paused_check'
    };
    var data = {
      method: 'POST',
      hostname: that.serverRoot,
      port: 443,
      path: that.path + 'channel_state',
      headers: headers,
      body: JSON.stringify({"channel": channel})
    };
    rp(data).then(function (obj) {
      cb(obj);
    })
      .catch(function (err) {
        cb(null);
      });
  }

  that.query = function (message) {
    var headers = {
      'Content-Type': 'application/json',
      'apikey': that.apiKey,
      'clientkey': that.clientkey
    };
    var data = {
      method: 'POST',
      hostname: that.nlpURL,
      port: 443,
      path: '/message',
      headers: headers,
      body: JSON.stringify({incoming: message.text})
    };
    return rp(data);
  }

  that.queryWithBot = function (bot, message) {
    return that
      .query(message)
      .then(function (obj) {
        if (obj.response && obj.confidence > 0.5) {
          bot.reply(message, obj.response);
          return Promise.resolve(obj);
        } else {
          that.logUnkownIntent(message);
          return Promise.reject();
        }
      })
      .catch(function (err) {
        return Promise.reject();
      });
  }

  return that;
}

function WordhopBotFacebook(wordhopbot, controller, debug) {
  var that = this;
  that.controller = controller;
  wordhopbot.platform = 'messenger';
  if (that.controller) {
    that
      .controller
      .on('message_received', function (bot, message) {
        wordhopbot.logUnkownIntent(message);
      });
  }

  // botkit middleware endpoints
  that.send = function (bot, message, next) {
    that.hopOut(message);
    next();
  };

  that.receive = function (bot, message, next) {
    that
      .hopIn(message, function (msg) {
        next();
      });
  };
}

function WordhopBotMicrosoft(wordhopbot, controller, debug) {
  var that = this;
  that.controller = controller;
  wordhopbot.platform = 'microsoft';
  if (that.controller) {
    that
      .controller
      .on('message_received', function (bot, message) {
        wordhopbot.logUnkownIntent(message);
      });
  }

  // botkit middleware endpoints
  that.send = function (bot, message, next) {
    that.hopOut(message);
    next();
  };

  that.receive = function (bot, message, next) {
    that
      .hopIn(message, function (msg) {
        next();
      });
  };
}

function WordhopBotSlack(wordhopbot, controller, debug) {
  var that = this;
  wordhopbot.platform = 'slack';
  that.controller = controller;

  // botkit middleware endpoints
  that.send = function (bot, message, next) {
    if (message.user == null) {
      message.user = bot.identity.id;
    }
    that.hopOut(message);
    next();
  };

  // botkit middleware endpoints
  that.receive = function (bot, message, next) {
    var msg = that.modifiedMessage(JSON.parse(JSON.stringify(message)), bot);
    if (msg.event) {
      that
        .hopIn(msg, function (res) {
          var isPaused = res;
          message.paused = isPaused;
          next();
        });
    } else {
      next();
    }
  };

  that.modifiedMessage = function (message, bot) {
    if ('message' == message.type) {
      var mentionSyntax = '<@' + bot.identity.id + '(\\|' + bot
        .identity
        .name
        .replace('.', '\\.') + ')?>';
      var mention = new RegExp(mentionSyntax, 'i');
      var direct_mention = new RegExp('^' + mentionSyntax, 'i');
      if (message.text) {
        message.text = message
          .text
          .trim();
      }
      if (message.channel.match(/^D/)) {
        // this is a direct message
        if (message.user == bot.identity.id) {
          return message;
        }
        if (!message.text) {
          // message without text is probably an edit
          return message;
        }
        // remove direct mention so the handler doesn't have to deal with it
        message.text = message
          .text
          .replace(direct_mention, '')
          .replace(/^\s+/, '')
          .replace(/^\:\s+/, '')
          .replace(/^\s+/, '');
        message.event = 'direct_message';
        return message;
      } else {
        if (message.user == bot.identity.id) {
          return message;
        }
        if (!message.text) {
          // message without text is probably an edit
          return message;
        }
        if (message.text.match(direct_mention)) {
          // this is a direct mention
          message.text = message
            .text
            .replace(direct_mention, '')
            .replace(/^\s+/, '')
            .replace(/^\:\s+/, '')
            .replace(/^\s+/, '');
          message.event = 'direct_mention';
          return message;
        } else if (message.text.match(mention)) {
          //message.event = 'mention';
          return message;
        } else {
          //message.event = 'ambient';
          return message;
        }
      }
    }
    return message;
  }
  if (that.controller) {
    // reply to a direct mention
    that
      .controller
      .on('direct_mention', function (bot, message) {
        wordhopbot.logUnkownIntent(message);
      });
    // reply to a direct message
    that
      .controller
      .on('direct_message', function (bot, message) {
        wordhopbot.logUnkownIntent(message);
      });
  }
}

module.exports = function (apiKey, clientkey, config) {

  if (!apiKey && !clientkey) {
    throw new Error('YOU MUST SUPPLY AN API_KEY AND A CLIENT_KEY TO WORDHOP!');
  }
  if (!apiKey) {
    throw new Error('YOU MUST SUPPLY AN API_KEY TO WORDHOP!');
  }
  if (!clientkey) {
    throw new Error('YOU MUST SUPPLY A CLIENT_KEY TO WORDHOP');
  }
  var serverRoot = 'wordhopapi.herokuapp.com';
  var socketServer = 'wordhop-socket-server.herokuapp.com';
  var nlpURL = 'wordhop-chatterbot.herokuapp.com';
  var path = '/api/v1/';
  var debug = false;
  var controller;
  var platform = 'slack';
  var token = '';
  var useWebhook = false;
  if (config) {
    debug = config.debug;
    serverRoot = config.serverRoot || serverRoot;
    nlpURL = config.nlpURL || nlpURL;
    controller = config.controller;
    platform = config.platform || platform;
    socketServer = config.socketServer || socketServer;
    token = config.token || token;
    useWebhook = config.useWebhook || useWebhook;
  }
  var wordhopbot = WordhopBot(apiKey, serverRoot, path, socketServer, clientkey, token, useWebhook, debug);
  wordhopbot.nlpURL = nlpURL;
  var wordhopObj;

  platform = platform.toLowerCase();

  if (platform == 'slack') {
    wordhopObj = new WordhopBotSlack(wordhopbot, controller, debug);
  } else if (platform == 'facebook' || platform == 'messenger') {
    platform = "messenger";
    wordhopObj = new WordhopBotFacebook(wordhopbot, controller, debug);
  } else if (platform == 'microsoft') {
    platform = "microsoft";
    wordhopObj = new WordhopBotMicrosoft(wordhopbot, controller, debug);
  } else {
    throw new Error('platform not supported. please set it to be either "slack" or "messenger (alias: facebook)".');
  }

  if (useWebhook === false) {
    wordhopObj.emit = wordhopbot.emit;
    wordhopObj.on = wordhopbot.on;
    wordhopObj.getSocketId = wordhopbot.getSocketId;
  }
  wordhopObj.checkForPaused = wordhopbot.checkForPaused;
  wordhopObj.hopOut = wordhopbot.hopOut;
  wordhopObj.logUnkownIntent = wordhopbot.logUnkownIntent;
  wordhopObj.assistanceRequested = wordhopbot.assistanceRequested;
  wordhopObj.query = wordhopbot.query;
  wordhopObj.queryWithBot = wordhopbot.queryWithBot;

  wordhopObj.hopIn = function (message, cb) {
    wordhopbot
      .hopIn(message)
      .then(function (obj) {
        var isPaused = true;
        if (obj) {
          isPaused = obj.paused;
        }
        message.paused = isPaused;
        if (cb) {
          cb(isPaused);
        }
      })
      .catch(function (err) {
        cb(false);
      });
  };

  wordhopObj.hopOut = function (message, cb) {
    wordhopbot
      .hopOut(message)
      .then(function (obj) {
        var isPaused = true;
        if (obj) {
          isPaused = obj.paused;
        }
        message.paused = isPaused;
        if (cb) {
          cb(isPaused);
        }
      })
      .catch(function (err) {
        cb(false);
      });
  };

  return wordhopObj;
};
