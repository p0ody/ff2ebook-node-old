require("./Debug");
var FFNET = require("./FFNET");
var Utils = require("./Utils");
var ErrorHandler = require("./ErrorHandler");

const SOURCE_FFNET  = "ffnet";
const SOURCE_FPCOM  = "fpcom";
const SOURCE_HPFF   = "hpff";

function Fic(socket)
{
    var self = this;
    self.url = false;
    self.title = false;
    self.author = false;
    self.chapCount = false;
    self.summary = false;
    self.wordsCount = false;
    self.pairing = false;
    self.ficId = false;
    self.forceUpdate = false;
    self.source = false;
    self.chapters = [];
    self.error = new ErrorHandler(socket);

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
                    handler = new FFNET(url, socket);
                    break;

                /*case SOURCE_FPCOM:
                    handler = new*/

            }
            populate(handler.getData());
        }
        else
            self.error.newError("Couldn't find fic source (Website.");

    };

    function populate(data)
    {

    }
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