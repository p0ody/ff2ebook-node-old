require('dotenv').config();
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var Utils = require("./src/Utils");

// Server init
var app = express();
var server = require('http').Server(app);

var port = Utils.normalizePort(process.env.PORT || '3000');
server.listen(port);

// Socket.IO
var io = require("socket.io")(server);
require("./src/socketHandler")(io);

// Debug utilities
require("./src/Debug")(app);

//Live reload
var livereload = require('livereload');
var reloadServer = livereload.createServer();
reloadServer.config.exts.push("ejs");
reloadServer.watch(__dirname +"/public");

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

//Routes
var routes = require('./routes/index');
app.use('/', routes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

// MySQL
var mysql = require("mysql");
global.db = mysql.createConnection(
{
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB
});

global.db.connect(function(err)
{
    if (err)
    {
        Debug(err);
    }
});


// Proto
String.prototype.replaceArray = function(find, replace) {
    var replaceString = this;
    var regex;
    for (var i = 0; i < find.length; i++) {
        regex = new RegExp(find[i], "g");
        replaceString = replaceString.replace(regex, replace[i]);
    }
    return replaceString;
};

module.exports = app;
