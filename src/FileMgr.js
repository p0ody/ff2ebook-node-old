var Debug = require("./Debug");
var Epub = require("./Epub");
var ErrorHandler = require("./ErrorHandler");

function FileMgr(callback)
{
    this.callback = callback;
}

FileMgr.prototype.createEpub = function(fic, callback)
{
    var epub = new Epub(fic, callback);
};

FileMgr.prototype.createMobi = function(path, callback)
{
    var self = this;
    var exec = require('child_process').execFile;
    var epub = global.path.basename(path);
    var mobi = process.env.ARCHIVE_DIR +"/"+ global.path.basename(path, ".epub") + ".mobi";

    var next = function()
    {
        exec(__dirname + "/../bin/kindlegen", [epub], {cwd: "./archive"}, function(err, stdout)
        {
            global.fs.stat(mobi, function(err, stats)
            {
                if (stats === undefined)
                {
                    self.error.newError("Error while converting to mobi.");
                    callback("Error while converting to mobi.");
                }
                else
                {
                    Debug.log("Mobi Ready.");
                    callback(null, mobi);
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
                    next();
                }
            })
        }
        else
            next();
    });

};

/**
 * @param path String
 * @param callback function()
 * */
FileMgr.prototype.fileExist = function(path, callback)
{
    global.fs.stat(path, function(err, stats)
    {
        if (err)
            callback(false);
        else
        {
            if (stats.isFile())
                callback(true);
        }

    });
};



module.exports = FileMgr;