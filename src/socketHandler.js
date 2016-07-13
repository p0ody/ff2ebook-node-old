var Debug = require("./Debug");
var Fic = require("./Fic");

function socketHandler(io)
{
    io.on('connection', function (socket)
    {
        Debug.log(socket.id + " Connected.");

        socket.on("convert-start", function(data)
        {
            var fic = new Fic(socket);
            var values =
            {
                url: data.url,
                forceUpdate: data.forceUpdate,
                fileType: data.fileType,
                sendEmail: data.sendEmail,
                emailAddress: data.email
            };
            fic.start(values);
        });
    });

}

module.exports = socketHandler;