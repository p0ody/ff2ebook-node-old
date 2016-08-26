var request = require("request");
var Chapter = require("./Chapter");
var Async = require("async");
var Debug = require("./Debug");

function FFNET(events)
{
    this.url = false;
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
    this.event = events;
}

FFNET.prototype.setURL = function(url)
{
    if (!url)
        return this.event.emit("critical", "Invalid url.");

    this.url = url;
};

FFNET.prototype.setFicId = function(id)
{
    if (!id)
        return this.event.emit("critical", "Invalid ficId.");

    this.ficId = id;
};

FFNET.prototype.gatherFicInfos = function(completedCallback)
{
    var self = this;
    Async.waterfall([
        function(callback)
        {
            var id = self.findId();
            if (!id)
                return callback("Couldn't find fic ID.");

            callback(null);
        },
        function(callback)
        {
            self.getPageSource(0, callback);
        },
        function(body, callback)
        {
            if (self.isValidFic(body))
            {
                var infos = self.findFicInfos(body);
                callback(null)
            }
            else
                callback("Invalid fic URL.");
        }
    ], completedCallback);
};

FFNET.prototype.gatherChaptersInfos = function(completedCallback)
{
    var self = this;
    Async.times(this.chapterCount + 1, function(i, next)
    {
        if (i > 0)
        {
            Async.retry({times: 3}, function (callback)
            {
                Debug.log("Getting chapter #"+ i);
                self.getPageSource(i, function ()
                {
                    var chapter = self.findChapterInfos(i);

                    if (!chapter)
                    {
                        self.event.emit("warning", "Error while fetching chapter #" + i + "... Retrying.");
                        callback("Error while fetching chapter #" + i)
                    }
                    else
                        callback(null, chapter);
                });
            }, function (err, chapter)
            {
                if (!err)
                    self.chapters.push(chapter);

                self.event.emit("chapReady", self.chapterCount);
                next(err);
            });
        }
        else
            next();
    }, completedCallback);
};


FFNET.prototype.getPageSource = function(chapNum, callback)
{
    var self = this;
    request(this.getURL(chapNum), function (err, res, body)
    {
        if (!err && res.statusCode == 200)
        {
            self.pageSource[chapNum] = body;
            callback(null, body);
        }
        else
        {
            self.pageSource[chapNum] = false;
            callback("Couldn't find page source for Infos page.");
        }
    });
};


FFNET.prototype.findId = function()
{
    if (this.ficId)
        return this.ficId;

    if (this.url === false)
        return false;

    var matches = this.url.match(/fanfiction\.net\/s\/([0-9]+)/i);

    if (matches === null)
        return false;

    this.ficId = matches[1];
    return matches[1];
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


FFNET.prototype.findFicInfos = function(body)
{
    this.title = this.findTitle(body);
    var author = this.findAuthor(body);
    this.author = author.name;
    this.authorId = author.id;
    this.ficType = this.findFicType(body);
    this.fandom = this.findFandom(body);
    this.summary = this.findSummary(body);
    this.publishedDate = this.findPublishedDate(body);
    this.updatedDate = this.findUpdatedDate(body);
    this.wordsCount = this.findWordsCount(body);
    this.chapterCount = this.findChapterCount(body);
    this.pairing = this.findPairing(body);
    this.status = this.findStatus(body);
};

FFNET.prototype.findChapterInfos = function(chapNum)
{

    var source = this.pageSource[chapNum];
    if (source === false)
    {
        Debug.log("Chap #"+ chapNum +": Invalid source.");
        return false;
    }

    var chapter = new Chapter();

    chapter.chapId = chapNum;
    chapter.title = this.findChapterTitle(source, chapNum);
    chapter.text = this.findChapterText(source);

    if (chapter.text === false)
    {
        Debug.log("Chap #"+ chapNum +": No text found.");
        return false;
    }

    return chapter;
};

FFNET.prototype.findTitle = function(source)
{
    var matches = source.match(/Follow\/Fav<\/button><b class='xcontrast_txt'>(.+?)<\/b>/i);
    if (matches === null)
    {
        this.warningEvent("Coulnd't find fic title.");
        return "Untitled";
    }

    return matches[1];
};

FFNET.prototype.findAuthor = function(source)
{
    var matches = source.match(/By:<\/span> <a class='xcontrast_txt' href='\/u\/([0-9]+?)\/.*?'>(.+?)<\/a>/i)

    if (matches === null)
    {
        this.warningEvent("warning", "Coulnd't find fic author.");
        return { name: "Unknown", id: 0 };
    }


    return { name: matches[2], id: matches[1] };
};

FFNET.prototype.findFicType = function(source)
{
    var matches = source.match(/<a class=xcontrast_txt href='.*?'>(.+?)<\/a><span class='xcontrast_txt icon-chevron-right xicon-section-arrow'><\/span><a class=xcontrast_txt href=.*?>(.+?)<\/a>/i)
    if (matches === null)
    {
        this.warningEvent("warning", "Coulnd't find fic type.");
        return false;
    }

    return matches[1] +"/"+ matches[2];
};

FFNET.prototype.findFandom = function(source)
{
    var matches = source.match(/<title>.+?, a (.+?) fanfic | FanFiction<\/title>/i);
    if (matches === null)
    {
        this.warningEvent("warning", "Coulnd't find fic fandom.");
        return false;
    }

    return matches[1];

};

FFNET.prototype.findSummary = function(source)
{
    var matches = source.match(/<div style='margin-top:2px' class='xcontrast_txt'>(.+?)<\/div>/i);
    if (matches === null)
    {
        this.warningEvent("warning", "Coulnd't find fic summary.");
        return false;
    }

    return matches[1];

};

FFNET.prototype.findPublishedDate = function(source)
{
    var matches = source.match(/Published: <span data-xutime='([0-9]+?)'>.*?<\/span>/i);
    if (matches === null)
    {
        this.warningEvent("warning", "Coulnd't find fic published date.");
        return false;
    }

    return matches[1];
};

FFNET.prototype.findUpdatedDate = function(source)
{
    var matches = source.match(/Updated: <span data-xutime='([0-9]+?)'>.*?<\/span>/i);
    if (matches === null)
    {
        this.warningEvent("warning", "Coulnd't find fic last updated date.");
        return this.publishedDate;
    }

    return matches[1];
};

FFNET.prototype.findWordsCount = function(source)
{
    var matches = source.match(/- Words: (.+?) -/i);
    if (matches === null)
    {
        this.warningEvent("warning", "Coulnd't find fic last updated date.");
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
        this.warningEvent("warning", "Coulnd't find fic pairing.");
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

FFNET.prototype.warningEvent = function(msg)
{
    if (this.event)
        this.event.emit("warning", msg);
};

FFNET.prototype.isValidFic = function(source)
{
    var matches = source.match(/<span class='gui_warning'>Story Not Found/i);
    if (matches === null)
        return true;

    return false;
};

module.exports = FFNET;