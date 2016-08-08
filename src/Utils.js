var Enums = require("./Enums");

module.exports =
{
    normalizePort: function (val)
    {
        var port = parseInt(val, 10);

        if (isNaN(port))
        {
            // named pipe
            return val;
        }

        if (port >= 0)
        {
            // port number
            return port;
        }

        return false;
    },

    /** @param {String} source
     @param {number} id
     @param {String} linkText */
    genFicURL: function (source, id, linkText)
    {
        switch (source)
        {
            case "ffnet":
                return "<a href=\"https://www.fanfiction.net/s/" + id + "\">" + linkText + "</a>";

            default:
                return linkText;
        }
    },

    /** @param {String} source
     @param {number} id
     @param {String} linkText */
    genAuthorURL: function (source, id, linkText)
    {
        switch (source)
        {
            case "ffnet":
                return "<a href=\"https://www.fanfiction.net/u/" + id + "\">" + linkText + "</a>";

            default:
                return linkText;
        }
    },

    findSource: function (url)
    {
        if (url.search("fanfiction.net") > -1)
            return Enums.Sources.FFnet;

        if (url.search("fictionpress.com") > -1)
            return Enums.Sources.FPcom;

        if (url.search("harrypotterfanfiction.com") > -1)
            return Enums.Sources.HPFF;

        return false;
    },

    isValidSource: function (source)
    {
        switch (source)
        {
            case Enums.Sources.FFnet:
            case Enums.Sources.FPcom:
            case Enums.Sources.HPFF:
                return true;

            default:
                return false;
        }
    }
};
