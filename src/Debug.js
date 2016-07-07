module.exports = function(app)
{
    this.Debug = function(log)
    {
        /*if (app.get('env') === 'development')
        {
            console.log(log);
        }*/

        console.log(app.get('env'));
    }
};
