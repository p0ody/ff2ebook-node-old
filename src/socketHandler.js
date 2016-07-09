require("./Debug");
var Fic = require("./Fic");

function socketHandler(io)
{
    io.on('connection', function (socket)
    {
        Debug(socket.id + " Connected.");

        socket.on("convert-start", function(data)
        {
            var fic = new Fic(socket);
            fic.start(data.url, data.forceUpdate);
        });
    });

}

module.exports = socketHandler;