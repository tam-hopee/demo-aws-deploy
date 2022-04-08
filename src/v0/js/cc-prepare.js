// CloudContract Pages:
// - index.html
var account, apigClient;
window.onload = async() => {
    $("#header").load("./header.html");
    $("#footer").load("./footer.html");
    $("#sidebar").load("./sidebar.html", null, function() {
        $("#docs-prepare").addClass("active");
    });
    account = new Account();
    var token = await account.getToken();
    var authInfo = await account.getAuthInfo()
    if (token === null) {
        window.location.href = cclogin_page;
        document.querySelector('#ccerror').style.display = 'block';
    } else {
        $(".cc-uname").text(account.cognitoUser.username)
        apigClient = apigClientFactory.newClient({
            accessKey: authInfo.accessKeyId,
            secretKey: authInfo.secretAccessKey,
            sessionToken: authInfo.sessionToken,
            apiKey: authInfo.apikey,
            region: authInfo.region
        });
        getSwitchUser();
        apigClient.documentPrepareGet(params = {
            status: "notset,notsend",
        }, {}).then(function(result) {
            getdocslist(JSON.parse(result.data.body).Items);
            $(".overlay").attr("style", "display: none;");
        }).catch(function(result) {
            erralert(result);
        });
    }
}

function getdocslist(json) {
    $("#cc-docslist").empty();
    json.forEach(function(v, i) {
        var status = (v["status"] == "notset") ? "送付先未設定" : "送付先設定済み（未送信）"
        $("#cc-docslist").append(
            $('<tr>').append(
                $('<td>').append(i + 1),
                $('<td>').append(v["filename"]),
                $('<td>').append(status),
                $('<td>').append(timestampConvertor(v["timestamp"]))
            )
        );
    });
}
