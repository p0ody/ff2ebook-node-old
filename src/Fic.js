var Debug = require("./Debug");
var FFNET = require("./FFNET");
var FileMgr = require("./FileMgr");
var Mailer = require("nodemailer");
var Enums = require("./Enums");
var Utils = require("./Utils");

function Fic(event)
{
    this.ficId = false;
    this.url = false;
    this.forceUpdate = false;
    this.source = false;
    this.event = event;
    this.handler = false;
    this.fm = new FileMgr();
    this.fileType = false;
    this.sendEmail = false;
    this.emailAddress = false;
    this.filePath = false;

    var self = this;
    self.event.on("warning", function(msg)
    {
        self.event.emit("warning", msg);
    });
}

Fic.prototype.start = function (infos)
{
    var self = this;

    if (!infos)
        return self.event.emit("error", "Invalid infos object");

    self.ficId = infos.ficId;
    self.source = infos.source;
    self.url = infos.url;
    self.forceUpdate = infos.forceUpdate;
    self.fileType = infos.fileType.toLowerCase();
    self.sendEmail = infos.sendEmail;
    self.emailAddress = infos.emailAddress;

    if (self.fileType != Enums.FileType.Epub && self.fileType != Enums.FileType.Mobi)
        return self.event.emit("critical", "Invalid filetype.");

    if (!self.source)
    {
        if (self.url)
            self.source = Utils.findSource(self.url);
        else
            return self.event.emit("critical", "Couldn't find fic source (Website)1.");
    }

    if (self.source === false)
        return self.event.emit("critical", "Couldn't find fic source (Website)2.");

    switch (self.source)
    {
        case Enums.Sources.FFnet:
            self.handler = new FFNET(self.event);

            Debug.log(self.ficId);
            if (self.ficId)
                self.handler.setFicId(self.ficId);
            else
                self.handler.setURL(self.url);

            self.handler.source = self.source;
            break;

        /*case Enums.Sources.FPcom:
         handler = new*/
    }

    self.handler.gatherFicInfos(self.gatherFicInfosCallback.bind(self));
};

Fic.prototype.sendFileReady = function()
{
    var self = this;
    self.event.emit("fileReady", {
        source: this.source,
        id: this.handler.ficId,
        fileType: this.fileType
    });

    if (self.sendEmail != true && self.emailAddress !== false)
        return;

    self.event.emit("emailStart");
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
                    self.event.emit("emailSent", "An error has occured.");
                    return Debug.log(err);
                }
                else
                {
                    self.event.emit("emailSent");
                    Debug.log("Email sent.");
                }

            });
        }
    });
};

Fic.prototype.gatherFicInfosCallback = function(err)
{
    var self = this;

    if (err)
        return self.event.emit("critical", err);

    self.event.emit("ficInfosReady");

    if (self.forceUpdate == true)
        return self.handler.gatherChaptersInfos(self.gatherChaptersInfosCallback.bind(self)); // Keep going in file creation

    // Check if fic is in DB
    global.db.query("SELECT * FROM `fic_archive` WHERE `id`=?;", [self.handler.ficId], function (err, result)
    {
        if (err)
        {
            Debug.log(err);
            return self.event.emit("critical", "Error while accessing database, please try again later");
        }

        if ((result.length > 0 && result[0].updated >= self.handler.updatedDate)) // If is in DB and is up to date, check if filetype requested is mobi, then send appropiate file.
        {
            var epub = process.env.ARCHIVE_DIR + "/" + result[0].filename;
            var mobi = epub.substr(0, epub.length - 4) + "mobi";
            self.fm.fileExist(epub, function (exist)
            {
                if (exist) // Epub exist
                {
                    if (self.fileType == Enums.FileType.Mobi)
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
                                self.event.emit("mobiStart");
                                self.event.emit("status", "Converting to mobi...");
                                self.fm.createMobi(epub, function (err, file)
                                {
                                    if (err)
                                        return self.event.emit("critical", "An error as occured while converting to mobi.");

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
                    self.handler.gatherChaptersInfos(self.gatherChaptersInfosCallback.bind(self)); // Keep going in file creation
                    global.db.query("DELETE FROM `fic_archive` WHERE `id`=?", [self.handler.ficId], function (err) // Delete entry in DB if the file is not on the server anymore.
                    {
                        if (err)
                            Debug.trace(err);
                    });
                }
            });
        }
        else // File is not in database
        {
            self.handler.gatherChaptersInfos(self.gatherChaptersInfosCallback.bind(self)); // Keep going in file creation
        }
    });
};

Fic.prototype.gatherChaptersInfosCallback = function(err)
{
    var self = this;

    if (err)
        return self.event.emit("critical", err);

    // Start epub creation
    self.event.emit("epubStart");
    self.fm.createEpub(self.handler, function (err, path)
    {
        if (err)
            return self.event.emit("critical", err);


        global.db.query("REPLACE INTO `fic_archive` (`site`,`id`,`title`,`author`,`authorID`,`updated`,`filename`) VALUES (?,?,?,?,?,?,?);",
            [self.source, self.handler.ficId, self.handler.title, self.handler.author, self.handler.authorId, self.handler.updatedDate, global.path.basename(path)],
            function (err)
            {
                if (err)
                {
                    Debug.log(err);
                    return self.event.emit("critical", "Error while accessing database, please try again later");
                }
                else
                {
                    // Start mobi convertion if filetype is mobi
                    self.event.emit("mobiStart");
                    self.event.emit("status", "Epub ready.");
                    if (self.fileType == Enums.FileType.Mobi)
                    {
                        self.event.emit("status", "Converting to Mobi...");
                        self.fm.createMobi(path, function (err, mobi)
                        {
                            if (err)
                                return self.event.emit("critical", "Error while converting to Mobi.");

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
};



module.exports = Fic;