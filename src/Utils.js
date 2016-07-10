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

    dynamicSort: function (property)
    {
        var sortOrder = 1;
        if (property[0] === "-")
        {
            sortOrder = -1;
            property = property.substr(1);
        }
        return function (a, b)
        {
            var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
            return result * sortOrder;
        }
    }
};