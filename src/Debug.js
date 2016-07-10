module.exports =
{
    log: function(log)
    {
        if (process.env.NODE_ENV === 'development')
            console.log(log);
    },

    trace: function(trace)
    {
        if (process.env.NODE_ENV === 'development')
            console.trace(trace);
    }
};
