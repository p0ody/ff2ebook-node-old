var Debug = require("./Debug");
var Fic = require("./Fic");

function socketHandler(io)
{
    io.on('connection', function (socket)
    {
        Debug.log(socket.id + " Connected.");

        socket.on("convert-start", function(data)
        {
            socket.emit("status", "Starting...");
            var fic = new Fic(socket);
            fic.start(data.url, data.forceUpdate, data.fileType);
        });
    });

}

module.exports = socketHandler;