var Debug = require("./Debug");
var FFNET = require("./FFNET");
var events = require("events");
var ErrorHandler = require("./ErrorHandler");
var FileMgr = require("./FileMgr");


const SOURCE_FFNET = "ffnet";
const SOURCE_FPCOM = "fpcom";
const SOURCE_HPFF = "hpff";
const TYPE_EPUB = "EPUB";
const TYPE_MOBI = "MOBI";

function Fic(socket)
{
    this.url = false;
    this.forceUpdate = false;
    this.source = false;
    this.error = new ErrorHandler(socket);
    this.events = new events.EventEmitter();
    this.handler = false;
    this.fm = new FileMgr(socket, this.events);
    this.socket = socket;
    this.fileType = false;
}

Fic.prototype.start = function (url, forceUpdate, fileType)
{
    var self = this;
    self.url = url;
    self.forceUpdate = forceUpdate;
    self.fileType = fileType;

    if (self.fileType != TYPE_EPUB && self.fileType != TYPE_MOBI)
        return self.error.newError("Invalid filetype.");

    var source = findSource(url);

    if (source === false)
        return self.error.newError("Couldn't find fic source (Website.");

    self.source = source;

    switch (self.source)
    {
        case SOURCE_FFNET:
            self.handler = new FFNET(url, self.socket, self.events);
            self.handler.source = source;
            break;

        /*case SOURCE_FPCOM:
         handler = new*/
    }

    self.handler.gatherFicInfos();


    // Event Handlers
    self.events.on("chaptersReady", function ()
    {
        Debug.log("Chapters ready");
        // Start epub creation
        self.fm.createEpub(self.handler, function (err, path)
        {
            if (err)
                return self.error.newError(err);


            global.db.query("REPLACE INTO `fic_archive` (`site`,`id`,`title`,`author`,`authorID`,`updated`,`filename`) VALUES (?,?,?,?,?,?,?);",
                [source, self.handler.ficId, self.handler.title, self.handler.author, self.handler.authorId, self.handler.updatedDate, global.path.basename(path)],
                function (err)
                {
                    if (err)
                    {
                        Debug.log(err);
                        return self.error.newError("Error while accessing database, please try again later");
                    }
                    else
                    {
                        // Start mobi convertion if filetype is mobi
                        self.socket.emit("status", "Epub ready.");
                        if (self.fileType == TYPE_MOBI)
                        {
                            self.socket.emit("status", "Converting to Mobi...");
                            self.fm.createMobi(path, function (err, mobi)
                            {
                                if (err)
                                    self.error.newError("Error while converting to Mobi.");
                                else
                                    self.socket.emit("fileReady", {
                                        source: self.source,
                                        id: self.handler.ficId,
                                        fileType: self.fileType
                                    }); // Tell client that the MOBI is ready
                            });
                        }
                        else
                            self.socket.emit("fileReady", {
                                source: self.source,
                                id: self.handler.ficId,
                                fileType: self.fileType
                            }); // Tell the client that the EPUB is ready
                    }
                })


        });
    });

    self.events.on("ficInfoReady", function ()
    {
        Debug.log("Fic Infos ready");

        if (self.forceUpdate == true)
            return self.handler.gatherChaptersInfos(); // Keep going in file creation

        // Check if fic is in DB
        global.db.query("SELECT * FROM `fic_archive` WHERE `id`=?;", [self.handler.ficId], function (err, result)
        {
            if (err)
            {
                Debug.log(err);
                return self.error.newError("Error whilte accessing database, please try again later");
            }

            if ((result.length > 0 && result[0].updated >= self.handler.updatedDate)) // If is in DB and is up to date, check if filetype requested is mobi, then send appropiate file.
            {
                var epub = process.env.ARCHIVE_DIR + "/" + result[0].filename;
                var mobi = epub.substr(0, epub.length - 4) + "mobi";
                self.fm.fileExist(epub, function (exist)
                {
                    if (exist) // Epub exist
                    {
                        if (self.fileType == TYPE_MOBI)
                        {
                            self.fm.fileExist(mobi, function (exist)
                            {
                                if (exist)
                                    return self.socket.emit("fileReady", {
                                        source: self.source,
                                        id: self.handler.ficId,
                                        fileType: self.fileType
                                    }); // Send fileReady to client for MOBI file if it already exists
                                else
                                {
                                    self.socket.emit("status", "Converting to mobi...");
                                    self.fm.createMobi(epub, function (err, file)
                                    {
                                        if (err)
                                            return self.error.newError("An error as occured while converting to mobi.");

                                        return self.socket.emit("fileReady", {
                                            source: self.source,
                                            id: self.handler.ficId,
                                            fileType: self.fileType
                                        }); //// Send fileReady to client for MOBI file after creating it
                                    });
                                }
                            });
                        }
                        else // EPUB exist and EPUB file requested
                        {
                            Debug.log("Epub already exist and is up to date.");
                            return self.socket.emit("fileReady", {
                                source: source,
                                id: self.handler.ficId,
                                fileType: self.fileType
                            }); // Send fileReady to client for EPUB file that already exists
                        }
                    }
                    else // EPUB doesnt exist
                    {
                        self.handler.gatherChaptersInfos(); // Keep going in file creation
                        global.db.query("DELETE FROM `fic_archive` WHERE `id`=?", [ self.handler.ficId ], function(err) // Delete entry in DB if the file is not on the server anymore.
                        {
                            if (err)
                                Debug.trace(err);
                        });
                    }
                });
            }
            else // File is not in database
            {
                self.handler.gatherChaptersInfos(); // Keep going in file creation
            }
        });
    });
};

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