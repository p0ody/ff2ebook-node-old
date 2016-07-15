var request = require("request");
var Chapter = require("./Chapter");
var ErrorHandler = require("./ErrorHandler");
require("./Debug");

function FFNET(url, socket, events)
{
    this.url = url;
    this.source = false;
    this.ficId = false;
    this.title = false;
    this.author = false;
    this.authorId = false;
    this.ficType = false;
    this.fandom = false;
    this.summary = false;
    this.publishedDate = false;
    this.updatedDate = false;
    this.wordsCount = false;
    this.chapterCount = false;
    this.pairing = false;
    this.status = false;
    this.pageSource = []; // pageSource[0] is fic info page
    this.chapters = [];
    this.error = new ErrorHandler(socket);
    this.events = events;
    this.chaptersReady = 0;
    this.socket = socket;

    var self = this;
    this.events.on("pageSource", function(chapNum)
    {
        if (chapNum === 0)
            self.findFicInfos();
        else if (chapNum > 0)
            self.findChapterInfos(chapNum);
    });

}

FFNET.prototype.gatherFicInfos = function()
{
    this.socket.emit("status", "Fetching fic data...");
    this.findID();
    this.getPageSource(0);
};

FFNET.prototype.gatherChaptersInfos = function()
{
    this.socket.emit("status", "Fetching chapters data...");
    for (var i = 1; i <= this.chapterCount; i++)
        this.getPageSource(i);
};

FFNET.prototype.getPageSource = function(chapNum)
{
    var self = this;
    request(this.getURL(chapNum), function (err, res, body)
    {
        if (!err && res.statusCode == 200)
        {
            self.pageSource[chapNum] = body;
        }
        else
        {
            self.pageSource[chapNum] = false;
        }

        self.events.emit("pageSource", chapNum);
    });
};

FFNET.prototype.findID = function()
{
    if (this.url === false)
        return false;

    var matches = this.url.match(/fanfiction\.net\/s\/([0-9]+)/i);

    if (matches === null)
    {
        this.error.newError("Couldn't find fic ID.");
        return false;
    }
    else
    {
        this.ficId = matches[1];
        return matches[1];
    }
};

FFNET.prototype.getURL = function(chapNum)
{
    if (chapNum === 0)
        return "http://www.fanfiction.net/s/"+ this.ficId;
    else
    {
        if (chapNum < 0)
            return false;

        return "http://m.fanfiction.net/s/"+ this.ficId +"/"+ chapNum;
    }

};

FFNET.prototype.findFicInfos = function()
{
    var source = this.pageSource[0];
    if (source === false)
    {
        this.error.newError("Couldn't get page source for fic infos.");
        return;
    }

    this.title = this.findTitle(source);
    var author = this.findAuthor(source);
    this.author = author.name;
    this.authorId = author.id;
    this.ficType = this.findFicType(source);
    this.fandom = this.findFandom(source);
    this.summary = this.findSummary(source);
    this.publishedDate = this.findPublishedDate(source);
    this.updatedDate = this.findUpdatedDate(source);
    this.wordsCount = this.findWordsCount(source);
    this.chapterCount = this.findChapterCount(source);
    this.pairing = this.findPairing(source);
    this.status = this.findStatus(source);

    this.events.emit("ficInfoReady");
};

FFNET.prototype.findChapterInfos = function(chapNum)
{

    var source = this.pageSource[chapNum];
    if (source === false)
    {
        this.error.newError("Couldn't get page source for chapter " + chapNum);
        return;
    }

    var chapter = new Chapter();

    chapter.chapId = chapNum;
    chapter.title = this.findChapterTitle(source, chapNum);
    chapter.text = this.findChapterText(source);

    if (chapter.text === false)
    {
        this.error.newError("Couldn't find chapter text for chapter #"+ chapNum);
        return;
    }

    this.socket.emit("chapReady", this.chapterCount);

    this.chapters[chapNum] = chapter;
    this.chaptersReady++;

    if (this.chaptersReady >= this.chapterCount)
        this.events.emit("chaptersReady", this);
};


FFNET.prototype.findTitle = function(source)
{
    var matches = source.match(/Follow\/Fav<\/button><b class='xcontrast_txt'>(.+?)<\/b>/i);
    if (matches === null)
    {
        this.error.newWarning("Coulnd't find fic title.");
        return "Untitled";
    }

    return matches[1];
};

FFNET.prototype.findAuthor = function(source)
{
    var matches = source.match(/By:<\/span> <a class='xcontrast_txt' href='\/u\/([0-9]+?)\/.*?'>(.+?)<\/a>/i)

    if (matches === null)
    {
        this.error.newWarning("Coulnd't find fic author.");
        return { name: "Unknown", id: 0 };
    }


    return { name: matches[2], id: matches[1] };
};

FFNET.prototype.findFicType = function(source)
{
    var matches = source.match(/<a class=xcontrast_txt href='.*?'>(.+?)<\/a><span class='xcontrast_txt icon-chevron-right xicon-section-arrow'><\/span><a class=xcontrast_txt href=.*?>(.+?)<\/a>/i)
    if (matches === null)
    {
        this.error.newWarning("Coulnd't find fic type.");
        return false;
    }


    return matches[1] +"/"+ matches[2];
};

FFNET.prototype.findFandom = function(source)
{
    var matches = source.match(/<title>.+?, a (.+?) fanfic | FanFiction<\/title>/i);
    if (matches === null)
    {
        this.error.newWarning("Coulnd't find fic fandom.");
        return false;
    }

    return matches[1];

};

FFNET.prototype.findSummary = function(source)
{
    var matches = source.match(/<div style='margin-top:2px' class='xcontrast_txt'>(.+?)<\/div>/i);
    if (matches === null)
    {
        this.error.newWarning("Coulnd't find fic summary.");
        return false;
    }

    return matches[1];

};

FFNET.prototype.findPublishedDate = function(source)
{
    var matches = source.match(/Published: <span data-xutime='([0-9]+?)'>.*?<\/span>/i);
    if (matches === null)
    {
        this.error.newWarning("Coulnd't find fic published date.");
        return false;
    }

    return matches[1];
};

FFNET.prototype.findUpdatedDate = function(source)
{
    var matches = source.match(/Updated: <span data-xutime='([0-9]+?)'>.*?<\/span>/i);
    if (matches === null)
    {
        this.error.newWarning("Coulnd't find fic last updated date.");
        return this.publishedDate;
    }

    return matches[1];
};

FFNET.prototype.findWordsCount = function(source)
{
    var matches = source.match(/- Words: (.+?) -/i);
    if (matches === null)
    {
        this.error.newWarning("Coulnd't find fic last updated date.");
        return false;
    }

    return matches[1];
};

FFNET.prototype.findChapterCount = function(source)
{
    var matches = source.match(/<option  value=.+?>/gi);
    if (matches === null)
        return 1;

    return matches.length / 2; // Dividing by 2 because there is a chapter selection on top and bottom of page
};

FFNET.prototype.findPairing = function(source)
{
    var matches = source.match(/target='rating'>.+?<\/a> - .*?-  (.+?) -/gi);
    if (matches === null)
    {
        this.error.newWarning("Coulnd't find fic pairing.");
        return false;
    }

    return matches[1];
}

FFNET.prototype.findStatus = function(source)
{
    var matches = source.match(/- Status: Complete -/i);
    if (matches === null)
        return "In progress";

    return "Completed";
};

FFNET.prototype.findChapterTitle = function(source, chapNum)
{
    var matches = source.match(/Chapter [0-9]+?: (.+?)<br><\/div><div role='main' aria-label='story content' style='font-size:1.1em;'>/i);
    if (matches === null)
        return "Chapter "+ chapNum;

    return matches[1];
};

FFNET.prototype.findChapterText = function(source)
{
    var matches = source.match(/<div style='padding:5px 10px 5px 10px;' class='storycontent nocopy' id='storycontent' >([\s\S]+?)<\/div>/i);
    if (matches === null)
        return false;

    return matches[1];

};

module.exports = FFNET;