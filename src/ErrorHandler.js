var Debug = require("./Debug");

function ErrorHandler(socket)
{
    var self = this;
    self.newError = function(msg)
    {
        socket.emit("critical", msg);
        Debug.log(msg);
    };

    self.newWarning = function(msg)
    {
        socket.emit("warning", msg);
        Debug.log(msg);
    };

}

module.exports = ErrorHandler;