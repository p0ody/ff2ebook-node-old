require("./Debug");
var FFNET = require("./FFNET");
var events = require("events");
var ErrorHandler = require("./ErrorHandler");
var FileMgr = require("./FileMgr");


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
    self.handler = false;
    self.fm = new FileMgr();

    self.start = function(url, forceUpdate)
    {
        self.url = url;
        self.forceUpdate = forceUpdate;
        var source = findSource(url);

        if (source !== false)
        {
            self.source = source;

            switch(self.source)
            {
                case SOURCE_FFNET:
                    self.handler = new FFNET(url, socket, self.events);
                    self.handler.source = source;
                    break;

                /*case SOURCE_FPCOM:
                    handler = new*/
            }
            self.handler.populate();
            self.events.on("chaptersReady", function()
            {
                Debug("Chapters ready");
                self.fm.createEpub(self.handler, socket);
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