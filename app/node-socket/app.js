var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var keys = require('./../config/keys');
console.log(keys.bitfinex.key)
var index = require('./routes/index');
var users = require('./routes/users');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var BitMEXClient = require('bitmex-realtime-api');

var Bitfinex = require('bitfinex');
var bitfinex = new Bitfinex(keys.bitfinex.key, keys.bitfinex.secret);


// var bitfinexApiNode = require('bitfinex-api-node')
//   bitfinexWebsocket = bitfinexApiNode.websocket,
//   bitfinexRest = bitfinexApiNode.rest;

var BitfinexWS = require ('bitfinex-api-node').WS;
var bws = new BitfinexWS(keys.bitfinex.key,keys.bitfinex.secret,2);
//console.log(process.cwd())

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use(function(req, res, next){
  res.io = io;
  next();
});




app.use('/', index);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});



var client = new BitMEXClient({testnet: false});
client.on('error', function(error) { console.log(error) });
var counter = 0;
client.addStream('XBTUSD', 'instrument', function(data, symbol, tableName) {
  //console.log(tableName);
  // if (counter === 0) { 
  // 	//console.log('data sample, now streaming to front end...'); console.log(data); 
  // }
  var spread = data[0].askPrice - data[0].bidPrice
  var dataMin = {'time':data[0].timestamp,'mark':data[0].markPrice,'bid':data[0].bidPrice,'ask':data[0].askPrice,'spread':Number(spread.toFixed(2))};
  //console.log(dataMin);
  io.emit("bitmex", dataMin);
  counter = 1;
});

bws.on('open', function () {
    bws.subscribeTicker('BTCUSD');
});


bws.on('ticker', function (pair, trade) {
    //console.log('Tick:', trade);
    var spread = trade.ask - trade.bid;
    var dataMin = {'bid':trade.bid,'ask':trade.ask,'spread':Number(spread.toFixed(2))};
    io.emit("bitfinex", dataMin);
});




module.exports = {app: app, server: server};
