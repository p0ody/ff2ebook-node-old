var Debug = require("./Debug");

function ErrorHandler(socket)
{
    var self = this;
    self.newError = function(msg)
    {
        socket.emit("critical", msg);
        Debug.log("Error: "+ msg);
    };

    self.newWarning = function(msg)
    {
        socket.emit("warning", msg);
        Debug.log("Warning: "+ msg);
    };

}

module.exports = ErrorHandler;