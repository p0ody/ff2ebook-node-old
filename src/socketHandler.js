require("./Debug");

function socketHandler(io)
{
    io.on('connection', function (socket)
    {
        Debug(socket.id + " Connected.");

        socket.on("convert-start", function(data)
        {
            Debug(data.url);

        });
    });

}

module.exports = socketHandler;