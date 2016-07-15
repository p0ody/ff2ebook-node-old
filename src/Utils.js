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
        switch(source)
        {
            case "ffnet":
                return "<a href=\"https://www.fanfiction.net/s/"+ id +"\">"+ linkText +"</a>";

            default:
                return linkText;
        }
    },

    /** @param {String} source
     @param {number} id
     @param {String} linkText */
    genAuthorURL: function (source, id, linkText)
    {
        switch(source)
        {
            case "ffnet":
                return "<a href=\"https://www.fanfiction.net/u/"+ id +"\">"+ linkText +"</a>";

            default:
                return linkText;
        }
    }
};