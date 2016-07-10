require("./Debug");
var ErrorHandler = require("./ErrorHandler");
var fs = require("fs-extra");
var async = require("async");
var tidy = require("htmltidy2").tidy;
var tidyOpts = {
    doctype: 'xhtml',
    indent: true,
    "indent-spaces": 4,
    clean: true
};
var uuid = require("uuid");
var JSZip = require("jszip");


function Epub(fic, socket)
{
    this.epubPath = process.env.ARCHIVE_DIR +"/"+ fic.source +"_"+ fic.ficId +"_"+ fic.updatedDate +".epub";
    this.content = [];
    this.fic = fic;
    this.error = new ErrorHandler(socket);
    this.uuid = uuid.v4();
    this.Utils = require("./Utils");
    this.zip = new JSZip();

    this.createEpub();
}

Epub.prototype.createEpub = function()
{
    var self = this;
    async.series([
        function(callback) // Check to see if dir exist
        {
            fs.stat(process.env.ARCHIVE_DIR, function(err, stats)
            {
                if (!stats)
                {
                    fs.mkdir(process.env.ARCHIVE_DIR, function (err)
                    {
                        if (err)
                        {
                            self.error.newError("Couldn't create archive dir.");
                            Debug(err);
                        }
                        Debug("Dir created");
                    });
                }
            });
            callback(null);
        },
        function(callback) // Check if epub already exist, if so delete
        {
            fs.stat(self.epubPath, function(err, stats)
            {
                if (stats !== undefined)
                {
                    fs.unlink(self.epubPath, function(err)
                    {
                        if (err)
                        {
                            Debug(err);
                            self.error.newError("Couldn't delete existing epub.");
                        }
                        else
                            Debug(self.epubPath +" Deleted.");
                    })
                }
            });
            callback(null);
        },
        function(callback) // Copy blank epub to archive folder
        {
            fs.copy("./blanks/epub/blank.epub", self.epubPath, function(err)
            {
                if (err)
                {
                    self.error.newError("Couldn't copy blank epub.");
                    Debug(err);
                }
                else
                    Debug("File copied");
            });

            callback(null);
        }
    ], self.genTitlePage());
};

Epub.prototype.genTitlePage = function()
{
    var self = this;
    fs.readFile("./blanks/title.xhtml", 'utf8', function(err, data)
    {
        if (err)
        {
            self.error.newError("Couldn't read title.xhtml.");
            Debug(err);
        }
        else
        {
            var find = [ "%title%", "%author", "%fandom%", "%summary%", "%status%", "%ficType%", "%pairing%", "%published%", "%updated%", "%wordsCount%", "%chapCount%", "%convertDate%" ];
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
                    Debug("Tidy: " + err);
                }
                else
                {
                    self.content.push(new EpubFile(html, "OEBPS/Content/title.xhtml"));
                    self.genChaptersPages();
                }
            });
        }
    });
};

Epub.prototype.genChaptersPages = function()
{
    var self = this;
    fs.readFile("./blanks/chapter.xhtml", 'utf8', function(err, data)
    {
        if (err)
        {
            self.error.newError("Couldn't read chapter.xhtml.");
            Debug(error);
        }
        else
        {
            self.fic.chapters.forEach(function(value, key)
            {
                var find = [ "%title%", "%chapNum%", "%body%" ];
                var replace = [ value.title, value.chapId, value.text ];

                tidy(data.replaceArray(find, replace), tidyOpts, function(err, html)
                {
                    if (err)
                    {
                        self.error.newError("Couldn't tidy chapter #"+ value.chapId);
                        Debug("Tidy: " + err);
                    }
                    else
                        self.content.push(new EpubFile(html, "OEBPS/Content/chapter"+ value.chapId +".xhtml"));
                });
            });
            self.genContentOPF();
        }
    });
};

Epub.prototype.genContentOPF = function()
{
    var self = this;
    fs.readFile("./blanks/epub/content.opf", 'utf8', function(err, data)
    {
        if (err)
        {
            self.error.newError("Couldn't read content.opf.");
            Debug(error);
        }
        else
        {
            var manifest = "";
            var spine = "";
            self.fic.chapters.forEach(function(value, key)
            {
                if (value.chapId > 0)
                {
                    manifest += "<item id=\"chap"+ value.chapId +"\" href=\"Content/chapter"+ value.chapId +".xhtml\" media-type=\"application/xhtml+xml\" />";
                    spine += "<itemref idref=\"chap"+ value.chapId +"\" />";
                }
            });

            var find = [ "%title%", "%author%", "%uuid%", "%chapManifest%", "%summary%", "%chapSpine%" ];
            var replace = [ self.fic.title, self.fic.author, self.uuid, manifest, spine ];

            self.content.push(new EpubFile(data.replaceArray(find, replace), "OEBPS/content.opf"));

            self.genTOC();
        }
    });
};

Epub.prototype.genTOC = function()
{
    var self = this;
    fs.readFile("./blanks/epub/toc.ncx", 'utf8', function(err, data)
    {
        if (err)
        {
            self.error.newError("Couldn't read toc.ncx.");
            Debug(error);
        }
        else
        {
            var toc = "";
            var chapters = self.fic.chapters.sort(self.Utils.dynamicSort("chapId"));

            chapters.forEach(function(value, key)
            {
                toc += "<navPoint id=\"navPoint-"+ (parseInt(value.chapId) + 1) +"\" playOrder=\""+ (parseInt(value.chapId) + 1) +"\">";
                toc += "<navLabel><text>"+ value.chapId +". "+ value.title + "</text></navLabel>";
                toc += "<content src=\"Content/chapter"+ value.chapId +".xhtml\"/>";
                toc += "</navPoint>";
            });

            var find = [ "%title%", "%uuid%", "%chapNav%" ];
            var replace = [ self.fic.title, self.uuid, toc ];

            self.content.push(new EpubFile(data.replaceArray(find, replace), "OEBPS/toc.ncx"));

            self.createFile();
        }
    });
};

Epub.prototype.createFile = function()
{
    var self = this;
    fs.readFile(self.epubPath, function(err, data)
    {
        if (err)
        {
            self.error.newError("Couldn't open epub.");
            Debug(error);
        }
        else
        {
            self.loadAsync(data);

            self.content.forEach(function(value)
            {
                zip.file(value.path, value.content);
                Debug("YAY!");
            });

        }
    });

};


function formatValue(header, value)
{
    if (!value)
        return "";

    return "<span class=\"bold\">"+ header +":</span> "+ value +"<br /><br />";
}

function EpubFile(content, path)
{
    this.content = content;
    this.filePath = path;
}


module.exports = Epub;