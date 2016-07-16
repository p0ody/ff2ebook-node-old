var Debug = require("./Debug");
var FFNET = require("./FFNET");
var events = require("events");
var ErrorHandler = require("./ErrorHandler");
var FileMgr = require("./FileMgr");
var Mailer = require("nodemailer");


const SOURCE_FFNET = "ffnet";
const SOURCE_FPCOM = "fpcom";
const SOURCE_HPFF = "hpff";
const TYPE_EPUB = "epub";
const TYPE_MOBI = "mobi";


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
    this.sendEmail = false;
    this.emailAddress = false;
    this.filePath = false;
}

Fic.prototype.start = function (infos)
{
    var self = this;
    self.url = infos.url;
    self.forceUpdate = infos.forceUpdate;
    self.fileType = infos.fileType.toLowerCase();
    self.sendEmail = infos.sendEmail;
    self.emailAddress = infos.emailAddress;

    if (self.fileType != TYPE_EPUB && self.fileType != TYPE_MOBI)
        return self.error.newError("Invalid filetype.");

    var source = findSource(self.url);

    if (source === false)
        return self.error.newError("Couldn't find fic source (Website.");

    self.source = source;

    switch (self.source)
    {
        case SOURCE_FFNET:
            self.handler = new FFNET(self.url, self.socket, self.events);
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
        self.socket.emit("epubStart");
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
                        self.socket.emit("mobiStart");
                        self.socket.emit("status", "Epub ready.");
                        if (self.fileType == TYPE_MOBI)
                        {
                            self.socket.emit("status", "Converting to Mobi...");
                            self.fm.createMobi(path, function (err, mobi)
                            {
                                if (err)
                                    return self.error.newError("Error while converting to Mobi.");

                                self.filePath = mobi;
                                return self.sendFileReady()
                            });
                        }
                        else
                        {
                            self.filePath = path;
                            return self.sendFileReady(); // Tell the client that the EPUB is ready
                        }
                    }
                })


        });
    });

    self.events.on("ficInfoReady", function ()
    {
        Debug.log("Fic Infos ready");
        self.socket.emit("ficInfosReady");

        if (self.forceUpdate == true)
            return self.handler.gatherChaptersInfos(); // Keep going in file creation

        // Check if fic is in DB
        global.db.query("SELECT * FROM `fic_archive` WHERE `id`=?;", [self.handler.ficId], function (err, result)
        {
            if (err)
            {
                Debug.log(err);
                return self.error.newError("Error while accessing database, please try again later");
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
                                {
                                    self.filePath = mobi;
                                    return self.sendFileReady(); // Send fileReady to client for MOBI file if it already exists
                                }
                                else
                                {
                                    self.socket.emit("mobiStart");
                                    self.socket.emit("status", "Converting to mobi...");
                                    self.fm.createMobi(epub, function (err, file)
                                    {
                                        if (err)
                                            return self.error.newError("An error as occured while converting to mobi.");

                                        self.filePath = file;
                                        return self.sendFileReady();// Send fileReady to client for MOBI file after creating it
                                    });
                                }
                            });
                        }
                        else // EPUB exist and EPUB file requested
                        {
                            Debug.log("Epub already exist and is up to date.");
                            self.filePath = epub;
                            return self.sendFileReady();// Send fileReady to client for EPUB file that already exists
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

Fic.prototype.sendFileReady = function()
{
    var self = this;
    self.socket.emit("fileReady", {
        source: this.source,
        id: this.handler.ficId,
        fileType: this.fileType
    });

    if (self.sendEmail != true && self.emailAddress !== false)
        return;

    self.socket.emit("emailStart");
    var mailOpts =
    {
        from: '"FF2EBOOK" <ebook-sender@ff2ebook.com>',
        to: self.emailAddress,
        subject: "Your eBook: " + self.handler.title + " - " + self.handler.author,
        text: "Enjoy!",
        attachments: [
            {
                filename: self.handler.title + " - " + self.handler.author + "." + self.fileType,
                path: self.filePath
            }
        ]
    };

    var smtpConfig =
    {
        service: "gmail",
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWD
        }
    };

    //var trans = Mailer.createTransport('smtps://ff2ebook%40gmail.com:Reev9tee@smtp.gmail.com');
    var trans = Mailer.createTransport(smtpConfig);

    trans.verify(function (err, success)
    {
        if (err)
            return Debug.log(err);
        else
        {

            Debug.log("SMTP connection good.");
            trans.sendMail(mailOpts, function (err, info)
            {
                if (err)
                {
                    self.socket.emit("emailSent", "An error has occured.");
                    return Debug.log(err);
                }
                else
                {
                    self.socket.emit("emailSent");
                    Debug.log("Email sent.");
                }

            });
        }
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