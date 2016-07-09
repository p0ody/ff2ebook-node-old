require("./Debug");

function ErrorHandler(socket)
{
    var self = this;
    self.newError = function(msg)
    {
        socket.emit("error", msg);
        Debug(msg);
    };

    self.newWarning = function(msg)
    {
        socket.emit("warning", msg);
        Debug(msg);
    };

}

module.exports = ErrorHandler;