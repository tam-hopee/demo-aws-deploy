// CloudContract Pages:
// - index.html
var account, apigClient;
window.onload = async() => {
    $("#header").load("./header.html");
    $("#footer").load("./footer.html");
    $("#sidebar").load("./sidebar.html", null, function() {
        $("#docs-check").addClass("m_receive_active");
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

function getdocslist(json) {
    $("#cc-docslist").empty();
    json.forEach(function(v, i) {
        var button = '<button type="button" onclick="location.href= \'./preview.html?key=' + v["key"] + '\'" class="btnBase">確認する</button>';
        $("#cc-docslist").append(
            $('<tr class="cc-index-filelist" doc-id="' + v["key"] + '">').append(
                $('<td>').append(v["filename"]),
                $('<td>').append(v["sender"]),
                $('<td>').append(timestampConvertor(v["expiretime"])),
                $('<td>').append(timestampConvertor(v["timestamp"])),
                $('<td>').append(button)
            )
        )
    });
    let table = '#cc-index-table';
    $(table).find('th').unbind();
    $(table).tablesorter({
        sortList: [[3, 1]],
        headers: {
            2: { sorter: 'date' },
            3: { sorter: 'date' },
            4: { sorter: false },
        }
    });
    $(table).trigger("updateAll", [true, function() {}]);
}

// 一覧上に表示されたファイル行を押下した時の処理
$(document).on("click", ".cc-index-filelist", function() {
    var key = $(this).attr("doc-id");
    location.href = './preview.html?key=' + key;
});
