require("./Debug");
var FFNET = require("./FFNET");
var Utils = require("./Utils");
var events = require("events");
var ErrorHandler = require("./ErrorHandler");

const SOURCE_FFNET  = "ffnet";
const SOURCE_FPCOM  = "fpcom";
const SOURCE_HPFF   = "hpff";

function Fic(socket)
{
    var self = this;
    self.url = false;
    self.forceUpdate = false;
    self.source = false;
    self.error = new ErrorHandler(socket);
    self.events = new events.EventEmitter();

    self.start = function(url, forceUpdate)
    {
        self.url = url;
        self.forceUpdate = forceUpdate;
        var source = findSource(url);

        if (source !== false)
        {
            self.source = source;
            var handler;

            switch(self.source)
            {
                case SOURCE_FFNET:
                    handler = new FFNET(url, socket, self.events);
                    break;

                /*case SOURCE_FPCOM:
                    handler = new*/
            }
            handler.populate();
            self.events.on("chaptersReady", function()
            {
                Debug("Chapters ready");
            });
        }
        else
            self.error.newError("Couldn't find fic source (Website.");

    };
}

function findSource(url)
{
    if (url.search("fanfiction.net") > -1)
        return SOURCE_FFNET;

    if (url.search("fictionpress.com") > -1)
        return SOURCE_FPCOM;

    if (url.search("harrypotterfanfiction.com") > -1)
        return SOURCE_HPFF;

    return false;
}


module.exports = Fic;