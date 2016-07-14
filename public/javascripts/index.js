var _chapReadyCount = 0;

$(document).ready(function ()
{
    showEmail($("#send-email").prop("checked"));
    var socket = io();

    $("#input-form").submit(function (e)
    {
        e.preventDefault();
        reset();
        if ($("#input-text").val().length <= 0)
            return;

        socket.emit("convert-start",
            {
                url: $("#input-text").val(),
                forceUpdate: $("#force-update").prop("checked"),
                fileType: $("#file-type").val(),
                sendEmail: $("#send-email").prop("checked"),
                email: $("#email-address").val()
            });

        $.ajax
        ({
            url: "/setCookie",
            method: "POST",
            data: {
                autoDL: $("#auto-dl").prop("checked"),
                fileType: $("#file-type").val(),
                sendEmail: $("#send-email").prop("checked"),
                email: $("#email-address").val()
            },
            dataType: "json"
        });
        enableInputs(false);
    });

    $("#send-email").change(function ()
    {
        showEmail(this.checked);
    });


    socket.on("critical", function(msg)
    {
        //alert("Error: "+ msg);
    });
    socket.on("warning", function(msg)
    {
        alert("Warning: "+ msg);
    });

    socket.on("status", updateStatusText);

    socket.on("chapReady", function(chapCount)
    {
        _chapReadyCount++;
        updateStatusText("Chapter ready: "+ _chapReadyCount +"/"+ chapCount);
    });

    socket.on("fileReady", function(data)
    {
        enableInputs(true);
        updateStatusText("<a id=\"download-link\" href=\"/download/"+ data.source +"/"+ data.id +"/"+ data.fileType +"\">Download!</a>");
        if ($("#auto-dl").prop("checked"))
            $("#download-link")[0].click();
    });

    socket.on("emailStart", function()
    {
        updateEmailSent("Sending email...", "yellow");
    });

    socket.on("emailSent", function(err)
    {
        if (err)
            return updateEmailSent("<span class=\"glyphicon glyphicon-ban-circle\" aria-hidden=\"true\"></span> "+ err, "red");

        updateEmailSent("<span class=\"glyphicon glyphicon-ok-circle\" aria-hidden=\"true\"></span> Email sent!", "#00FF40");
    });

});

function showEmail(bool)
{
    if (bool)
    {
        $("#email-address").show();
        $("#email-sent").show();
    }
    else
    {
        $("#email-address").hide();
        $("#email-sent").hide();
    }

}


function updateStatusText(msg)
{
    $("#status-text").html(msg);
}

function reset()
{
    _chapReadyCount = 0;
    updateStatusText("Ready.");
    enableInputs(true);
    updateEmailSent("");
}

function enableInputs(bool)
{
    if (bool === true)
    {
        $("#fic-submit").removeAttr("disabled");
        $("#input-text").removeAttr("readonly");
        $("#file-type").removeAttr("disabled");
        $("#force-update").removeAttr("disabled");
        $("#auto-dl").removeAttr("disabled");
        $("#send-email").removeAttr("disabled");
        $("#email-address").removeAttr("readonly");
    }
    else
    {
        $("#fic-submit").attr("disabled", "disabled");
        $("#input-text").attr("readonly", "readonly");
        $("#file-type").attr("disabled", "disabled");
        $("#force-update").attr("disabled", "disabled");
        $("#auto-dl").attr("disabled", "disabled");
        $("#send-email").attr("disabled", "disabled");
        $("#email-address").attr("readonly", "readonly");
    }
}

function updateEmailSent(msg, color)
{
    if (color === undefined)
        color = "white";

    $("#email-sent").html("<span style=\"color: "+ color +"\">"+ msg +"</span>");
}