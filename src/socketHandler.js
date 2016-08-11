var Debug = require("./Debug");
var Fic = require("./Fic");
var ErrorHandler = require("./ErrorHandler");
var FicEventHandler = require("./FicEventHandler");
var Events = require("events");


function socketHandler(io)
{
    io.on('connection', function (socket)
    {
        Debug.log(socket.id + " Connected.");

        socket.on("convert-start", function(data)
        {
            var handler = initEventHandler(socket);
            
            handler.getEvent().emit("convertStart", data);
        });
    });

}

module.exports = socketHandler;



function initEventHandler(socket)
{
    var event = new Events.EventEmitter();
    var errorHandler = new ErrorHandler(socket);

    var handler = new FicEventHandler();

    // Override abstract functions
    handler.onStart = function(data)
    {
        var fic = new Fic(handler.getEvent());
        var values =
        {
            url: data.url,
            forceUpdate: data.forceUpdate,
            fileType: data.fileType,
            sendEmail: data.sendEmail,
            emailAddress: data.email
        };

        fic.start(values);
    };

    handler.onError = function(msg) { errorHandler.newError(msg); };
    handler.onWarning = function(msg) { errorHandler.newWarning(msg); };
    handler.onFileReady = function(infos) { socket.emit("fileReady", infos); };
    handler.onFicInfosReady = function() { socket.emit("ficInfosReady"); };
    handler.onStatus = function(msg) { socket.emit("status", msg); };
    handler.onEpubStart = function() { socket.emit("epubStart"); };
    handler.onEmailStart = function() { socket.emit("EmailStart"); };
    handler.onEmailSent = function(err) { socket.emit("EmailSent", err); };
    handler.onMobiStart = function() { socket.emit("mobiStart"); };
    handler.onChapReady = function(chapCount) { socket.emit("chapReady", chapCount); };
    
    handler.bindEvent(event);

    return handler;
}