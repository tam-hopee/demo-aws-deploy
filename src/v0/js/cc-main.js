// CloudContract Pages:
// - index.html
var account, apigClient;
window.onload = async() => {
    $("#header").load("./header.html");
    $("#footer").load("./footer.html");
    $("#sidebar").load("./sidebar.html", null, function() {
        $("#docs-main").addClass("m_top_active");
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
        
        apigClient.userPost(params = {}, {
            email: account.cognitoUser.username
        }).then(function(result) {
            getSwitchUser();
            apigClient.documentReceiverGet(params = {
                status: "sent",
                key: "",
                folderid: ""
            }, {}).then(function(result) {
                getdocslist(JSON.parse(result.data.body).Items);
                $(".overlay").attr("style", "display: none;");
            }).catch(function(result) {
                // TODO: エラー発生時の処理
                console.log(result);
            });
        }).catch(function(result) {
            // TODO: エラー発生時の処理
            console.log(result);
        });
    }
}
