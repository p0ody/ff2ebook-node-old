Debug = require("./Debug");
var ErrorHandler = require("./ErrorHandler");
var async = require("async");
var tidy = require("htmltidy2").tidy;
var EpubGen = require("epub-generator");

var tidyOpts = {
    doctype: 'xhtml',
    indent: true,
    "indent-spaces": 4,
    clean: true
};

function Epub(fic, socket, events)
{
    this.epubPath = process.env.ARCHIVE_DIR +"/"+ fic.source +"_"+ fic.ficId +"_"+ fic.updatedDate +".epub";
    this.content = [];
    this.fic = fic;
    this.error = new ErrorHandler(socket);
    this.Utils = require("./Utils");
    this.epub = false;
    this.events = events;

    this.createEpub();
}

Epub.prototype.createEpub = function()
{
    var self = this;
    async.series([
        function(callback) // Check to see if dir exist
        {
            global.fs.stat(process.env.ARCHIVE_DIR, function(err, stats)
            {
                if (!stats)
                {
                    global.fs.mkdir(process.env.ARCHIVE_DIR, function (err)
                    {
                        if (err)
                        {
                            self.error.newError("Couldn't create archive dir.");
                        }
                        Debug.log("Dir created");
                    });
                }
            });
            callback(null);
        },
        function(callback) // Check if epub already exist, if so delete
        {
            global.fs.stat(self.epubPath, function(err, stats)
            {
                if (stats !== undefined)
                {
                    global.fs.unlink(self.epubPath, function(err)
                    {
                        if (err)
                        {
                            self.error.newError("Couldn't delete existing epub.");
                        }
                        else
                            Debug.log(self.epubPath +" Deleted.");
                    })
                }
            });
            callback(null);
        }], self.genTitlePage());
};

Epub.prototype.genTitlePage = function()
{
    var self = this;
    global.fs.readFile("./blanks/title.xhtml", 'utf8', function(err, data)
    {
        if (err)
        {
            self.error.newError("Couldn't read title.xhtml.");
        }
        else
        {
            var find = [ "%title%", "%author%", "%fandom%", "%summary%", "%status%", "%ficType%", "%pairing%", "%published%", "%updated%", "%wordsCount%", "%chapCount%", "%convertDate%" ];
            var replace = [
                self.fic.title,
                self.fic.author,
                formatValue("Fandom", self.fic.fandom),
                formatValue("Summary", self.fic.summary),
                formatValue("Status", self.fic.status),
                formatValue("FicType", self.fic.ficType),
                formatValue("Pairing/Main char.", self.fic.pairing),
                formatValue("Published date", self.fic.publishedDate),
                formatValue("Updated date", self.fic.updatedDate),
                formatValue("Words count", self.fic.wordsCount),
                formatValue("Chapter count", self.fic.chapterCount),
                new Date().toISOString().substring(0, 10)
            ];

            tidy(data.replaceArray(find, replace), tidyOpts, function(err, html)
            {
                if (err)
                {
                    self.error.newError("Couldn't use htmltidy on title page.");
                }
                else
                {
                    self.content.push(new EpubFile(html, "Content/title.xhtml", "xhtml", "Title Page", 1));
                    self.genChaptersPages();
                }
            });
        }
    });
};

Epub.prototype.genChaptersPages = function()
{
    var self = this;
    global.fs.readFile("./blanks/chapter.xhtml", 'utf8', function(err, data)
    {
        if (err)
        {
            self.error.newError("Couldn't read chapter.xhtml.");
        }
        else
        {
            async.each(self.fic.chapters, function(chap, callback)
            {
                if (chap)
                {
                    var find = ["%title%", "%chapNum%", "%body%"];
                    var replace = [chap.title, chap.chapId, chap.text];

                    tidy(data.replaceArray(find, replace), tidyOpts, function (err, html)
                    {
                        if (err)
                        {
                            self.error.newError("Couldn't tidy chapter #" + chap.chapId);
                            callback(err);
                        }
                        else
                        {
                            self.content.push(new EpubFile(html, "Content/chapter" + chap.chapId + ".xhtml", "xhtml", chap.title, parseInt(chap.chapId) + 1));
                            callback(null);
                        }
                    });
                }
                else
                    callback(null);

            }, function() {
                Debug.log("Tidy finished");
                self.genStyle();
            });
        }
    });
};

Epub.prototype.genStyle = function()
{
    var self = this;
    global.fs.readFile("./blanks/style.css", 'utf8', function(err, data)
    {
        if (err)
        {
            self.error.newError("Couldn't read content.opf.");
        }
        else
        {
            self.content.push(new EpubFile(data, "Styles/style.css", "css"));
            self.createFile();
        }
    });

};

Epub.prototype.createFile = function(err)
{
    if (err)
    {
        this.error.newError("Error while generating files.");
    }

    var self = this;
    Debug.log("Starting file creation...");

    this.epub = new EpubGen({
        title: self.fic.title,
        author: self.fic.author
    });


    var content = this.content.sort(function(a, b)
    {
        return a.order - b.order;
    });


    content.forEach(function(value)
    {
        self.epub.add(value.filePath, value.content, { title: value.title, toc: value.filetype == "xhtml" });
    });

    self.epub.end().pipe(global.fs.createWriteStream(self.epubPath));

    self.epub.on('error', function(err)
    {
        console.trace(err);
    });

    self.epub.on("finish", function()
    {
        Debug.log("Epub ready.");
        self.events.emit("epubReady", self.epubPath);
    });
};


function formatValue(header, value)
{
    if (!value)
        return "";

    return "<span class=\"bold\">"+ header +":</span> "+ value +"<br /><br />";
}

function EpubFile(content, path, type, title, order)
{
    this.content = content;
    this.filePath = path;
    this.title = title;
    this.order = (order === undefined) ? 0 : order;
    this.filetype = type;
}


module.exports = Epub;