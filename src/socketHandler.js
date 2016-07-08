require("./Debug");

function socketHandler(io)
{
    io.on('connection', function (socket)
    {
        Debug(socket.id + " Connected.");
    });

}

module.exports = socketHandler;