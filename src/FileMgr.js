var Debug = require("./Debug");
var Epub = require("./Epub");
var ErrorHandler = require("./ErrorHandler");

function FileMgr(socket, events)
{
    this.events = events;
    this.socket = socket;
    this.error = new ErrorHandler(socket);
}

FileMgr.prototype.createEpub = function(fic)
{
    var epub = new Epub(fic, this.socket, this.events);
};

FileMgr.prototype.createMobi = function(path)
{
    var self = this;
    var exec = require('child_process').execFile;
    var epub = global.path.basename(path);
    var mobi = process.env.ARCHIVE_DIR +"/"+ global.path.basename(path, ".epub") + ".mobi";

    var callback = function()
    {
        exec(__dirname + "/../bin/kindlegen", [epub], {cwd: "./archive"}, function(err, stdout)
        {
            global.fs.stat(mobi, function(err, stats)
            {
                if (stats === undefined)
                {
                    self.error.newError("Error while converting to mobi.");
                }
                else
                {
                    self.events.emit("mobiReady");
                    Debug.log("Mobi Ready.");
                }
            });

        });
    };

    global.fs.stat(mobi, function(err, stats)
    {
        if (stats !== undefined)
        {
            global.fs.unlink(mobi, function(err)
            {
                if (err)
                {
                    self.error.newError("Couldn't delete existing mobi.");
                }
                else
                {
                    Debug.log(mobi + " Deleted.");
                    callback();
                }
            })
        }
        else
            callback();
    });

};




module.exports = FileMgr;