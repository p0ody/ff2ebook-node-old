var request = require("request");
var events = require("events");
var Chapter = require("./Chapter");
var ErrorHandler = require("./ErrorHandler");
require("./Debug");

function FFNET(url, socket)
{
    var self = this;
    self.url = url;
    self.ficId = false;
    self.title = false;
    self.author = false;
    self.authorId = false;
    self.ficType = false;
    self.fandom = false;
    self.summary = false;
    self.publishedDate = false;
    self.updatedDate = false;
    self.wordsCount = false;
    self.chapterCount = false;
    self.pairing = false;
    self.status = false;
    self.pageSource = []; // pageSource[0] is fic info page
    self.chapters = [];
    self.error = new ErrorHandler(socket);
    self.events = new events.EventEmitter();

    self.getData = function(url)
    {
        populate();
    };

    function populate()
    {
        findID();
        getPageSource(0);
    }

    function getPageSource(chapNum)
    {
        request(getURL(chapNum), function (err, res, body)
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
    }

    function findID()
    {
        if (self.url === false)
            return false;

        var matches = self.url.match(/fanfiction\.net\/s\/([0-9]+)/i);

        if (matches === null)
            self.error.newError("Couldn't find fic ID.");
        else
            self.ficId = matches[1];
    }

    function getURL(chapNum)
    {
        if (chapNum === 0)
            return "http://www.fanfiction.net/s/"+ self.ficId;
        else
        {
            if (chapNum < 0)
                return false;

            return "http://m.fanfiction.net/s/"+ self.ficId;
        }

    }

    function findFicInfos()
    {
        socket.emit("status", "Fetching fic data...");
        var source = self.pageSource[0];
        if (source === false)
        {
            self.error.newError("Couldn't get page source for fic infos.");
            return;
        }

        self.title = findTitle(source);
        var author = findAuthor(source);
        self.author = author.name;
        self.authorId = author.id;
        self.ficType = findFicType(source);
        self.fandom = findFandom(source);
        self.summary = findSummary(source);
        self.publishedDate = findPublishedDate(source);
        self.updatedDate = findUpdatedDate(source);
        self.wordsCount = findWordsCount(source);
        self.chapterCount = findChapterCount(source);
        self.pairing = findPairing(source);
        self.status = findStatus(source);

        socket.emit("status", "Fetching chapters data...");
        for (var i = 1; i <= self.chapterCount; i++)
            getPageSource(i);
    }

    function findChapterInfos(chapNum)
    {
        socket.emit("status", "Chapter "+ chapNum +"...");

        var source = self.pageSource[chapNum]
        if (source === false)
        {
            self.error.newError("Couldn't get page source for chapter " + chapNum);
            return;
        }

        var chapter = new Chapter();

        chapter.chapId = chapNum;
        chapter.title = findChapterTitle(source);
        chapter.text = findChapterText(source);

        if (chapter.text === false)
        {
            self.error.newError("Couldn't find chapter text for chapter #"+ chapNum);
            return;
        }

        self.chapters[chapNum] = chapter;
    }

    self.events.on("pageSource", function(chapNum)
    {
        if (chapNum === 0)
            findFicInfos();
        else if (chapNum > 0)
            findChapterInfos(chapNum);
    });


    function findTitle(source)
    {
        var matches = source.match(/Follow\/Fav<\/button><b class='xcontrast_txt'>(.+?)<\/b>/i);
        if (matches === null)
        {
            self.error.newWarning("Coulnd't find fic title.");
            return "Untitled";
        }

        return matches[1];
    }

    function findAuthor(source)
    {
        var matches = source.match(/By:<\/span> <a class='xcontrast_txt' href='\/u\/([0-9]+?)\/.*?'>(.+?)<\/a>/i)

        if (matches === null)
        {
            self.error.newWarning("Coulnd't find fic author.");
            return { name: "Unknown", id: 0 };
        }


        return { name: matches[2], id: matches[1] };
    }

    function findFicType(source)
    {
        var matches = source.match(/<a class=xcontrast_txt href='.*?'>(.+?)<\/a><span class='xcontrast_txt icon-chevron-right xicon-section-arrow'><\/span><a class=xcontrast_txt href=.*?>(.+?)<\/a>/i)
        if (matches === null)
        {
            self.error.newWarning("Coulnd't find fic type.");
            return false;
        }


        return matches[1] +"/"+ matches[2];
    }

    function findFandom(source)
    {
        var matches = source.match(/<title>.+?, a (.+?) fanfic | FanFiction<\/title>/i);
        if (matches === null)
        {
            self.error.newWarning("Coulnd't find fic fandom.");
            return false;
        }

        return matches[1];

    }

    function findSummary(source)
    {
        var matches = source.match(/<div style='margin-top:2px' class='xcontrast_txt'>(.+?)<\/div>/i);
        if (matches === null)
        {
            self.error.newWarning("Coulnd't find fic summary.");
            return false;
        }

        return matches[1];

    }

    function findPublishedDate(source)
    {
        var matches = source.match(/Published: <span data-xutime='([0-9]+?)'>.*?<\/span>/i);
        if (matches === null)
        {
            self.error.newWarning("Coulnd't find fic published date.");
            return false;
        }

        return matches[1];
    }

    function findUpdatedDate(source)
    {
        var matches = source.match(/Updated: <span data-xutime='([0-9]+?)'>.*?<\/span>/i);
        if (matches === null)
        {
            self.error.newWarning("Coulnd't find fic last updated date.");
            return false;
        }

        return matches[1];
    }

    function findWordsCount(source)
    {
        var matches = source.match(/- Words: (.+?) -/i);
        if (matches === null)
        {
            self.error.newWarning("Coulnd't find fic last updated date.");
            return false;
        }

        return matches[1];
    }

    function findChapterCount(source)
    {
        var matches = source.match(/<option  value=.+?>/gi);
        if (matches === null)
            return 1;

        return matches.length / 2; // Dividing by 2 because there is a chapter selection on top and bottom of page
    }

    function findPairing(source)
    {
        var matches = source.match(/target='rating'>.+?<\/a> - .*?-  (.+?) -/gi);
        if (matches === null)
        {
            self.error.newWarning("Coulnd't find fic pairing.");
            return false;
        }

        return matches[1];
    }

    function findStatus(source)
    {
        var matches = source.match(/- Status: Complete -/i);
        if (matches === null)
            return "In progress";

        return "Completed";
    }

    function findChapterTitle(source)
    {
        var matches = source.match(/Chapter [0-9]+?: (.+?)<br><\/div><div role='main' aria-label='story content' style='font-size:1.1em;'>/i);
        if (matches === null)
            return "Chapter "+ chapNum;

        return matches[1];
    }

    function findChapterText(source)
    {
        var matches = source.match(/<div style='padding:5px 10px 5px 10px;' class='storycontent nocopy' id='storycontent' >(.+?)<\/div>/i);
        if (matches === null)
            return false;

        return matches[1];

    }
}

module.exports = FFNET;