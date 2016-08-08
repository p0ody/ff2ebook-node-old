var Debug = require("./Debug");
var Async = require("async");

module.exports =
{
    /**
     * @param {String} search
     * @param {number} page
     * @param {function} returnCallback
     */
    searchFor: function (search, page, returnCallback)
    {
        if (search.length == 0)
            return returnCallback("Invalied search value.");

        if (isNaN(page))
            return returnCallback("invalid page number.");

        Async.parallel({
            count: function (callback)
            {
                global.db.query("SELECT COUNT(*) as `count` FROM `fic_archive` WHERE `id` LIKE ? OR `title` LIKE ? or `author` LIKE ? ORDER BY `title`;", [ "%"+ search +"%", "%"+ search +"%", "%"+ search +"%" ], function (err, results)
                {
                    if (err)
                    {
                        Debug.trace(err);
                        return callback("An error has occured while accessing database.");
                    }


                    callback(null, results[0].count);
                });
            },
            search: function (callback)
            {
                var offset = (page == 1 ? "0" : (page * process.env.SEARCH_RESULT_PER_PAGE) - process.env.SEARCH_RESULT_PER_PAGE);
                global.db.query("SELECT * FROM `fic_archive` WHERE `id` LIKE ? OR `title` LIKE ? or `author` LIKE ? ORDER BY `title` LIMIT " + offset + ", " + process.env.SEARCH_RESULT_PER_PAGE + ";", [ "%"+ search +"%", "%"+ search +"%", "%"+ search +"%" ], function (err, results)
                {
                    if (err)
                    {
                        Debug.trace(err);
                        return callback("An error has occured while accessing database.");
                    }

                    if (results.length <= 0)
                        return callback("No match found.");


                    callback(null, results);
                });
            }
        }, function (err, results) // Completed callback
        {
            returnCallback(err, results);
        });

    }
};