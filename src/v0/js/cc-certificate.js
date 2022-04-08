// CloudContract Pages:
// - index.html
var account, apigClient, isGuest, receiverCode, myEmail;
window.onload = async() => {
    account = new Account();
    var token = await account.getToken();
    var authInfo = await account.getAuthInfo();
    isGuest = (token === null) ? true : false;
    if (token === null) {
        // ゲストユーザーの場合
        if (getGetParams().guest) {
            // メール認証済み
            apigClientFactory.newClient().documentKeysGet({
                key: getGetParams().key,
                receiver: getGetParams().guest,
                authkey: "",
                verifycode: ""
            }, {}).then(function(result) {
                var res = JSON.parse(result.data.body);
                if (res.result === "expired") console.log("expired");
                else if (res.result === "invalid") console.log("invalid");
                else setDocsInfo(res.Items[0]);
            }).catch(function(result) {
                window.location.href = "./index.html";
            });
            apigClientFactory.newClient().timestampGet(params = {}, {}).then(function(result) {
                var timestamp = timestampConvertor(result.data.body);
                $("#cc-certificate-time").text(timestamp + " (JST)");
            }).catch(function(result) {
                window.location.href = "./index.html";
            });
        } else {
            window.location.href = "./index.html";
        }
    } else {
        this.myEmail = account.cognitoUser.username;
        var processMyCrypto = myCrypto(this.myEmail).then(function(key) {
            this.receiverCode = key;
        });
        apigClient = apigClientFactory.newClient({
            accessKey: authInfo.accessKeyId,
            secretKey: authInfo.secretAccessKey,
            sessionToken: authInfo.sessionToken,
            apiKey: authInfo.apikey,
            region: authInfo.region
        });
        if (!getGetParams().key) window.location.href = "./index.html";
        else {
            Promise.all([processMyCrypto]).then(function() {
                apigClient.documentKeysAuthGet(params = {
                    key: getGetParams().key,
                    receiver: this.receiverCode
                }, {}).then(function(result) {
                    var res = JSON.parse(result.data.body);
                    if (res.result === "expired") console.log("expired");
                    else if (invalidcheck(res.Items[0], this.myEmail)) console.log("invalid");
                    else setDocsInfo(res.Items[0]);
                }).catch(function(result) {
                    window.location.href = "./index.html";
                });
                apigClient.timestampGet(params = {}, {}).then(function(result) {
                    var timestamp = timestampConvertor(result.data.body);
                    $("#cc-certificate-time").text(timestamp + " (JST)");
                }).catch(function(result) {
                    window.location.href = "./index.html";
                });
            });
        }
    }
}

setDocsInfo = (data) => {
    var title = "合意締結証明書 - クラウドコントラクト - ";
    // 契約書基本情報
    $("title").text(title + data.key);
    $("#cc-docs-name").text(data.filename);
    $("#cc-docs-id").text(data.key);
    // 合意締結当事者の情報
    // 送信者情報
    // ・社内稟議機能対応：稟議ありの場合はレビュー完了日時をメール送信日時とする
    let senttime = (data.reviewedtime) ? data.reviewedtime : data.createdtime;
    $("#cc-created-time > b").text(timestampConvertor(senttime) + " (JST)");
    $("#cc-sender-mail > b").text(data.sender);
    // 受信者情報
    var receiver = '';
    if (typeof data.processed_receivers === typeof []) {
        // 配列の場合（＝複数者間契約の実装リリース後に発生するパターン）
        data.processed_receivers.forEach(function(val) {
            _setProcessedReceivers(val.receiver, timestampConvertor(val.timestamp));
        });
    } else {
        _setProcessedReceivers(data.receiver, timestampConvertor(data.timestamp));
    }
    $("#cc-certificate-time").text();
    $(".fa-spin").remove();
}

_setProcessedReceivers = (receiver, timestamp) => {
    var info = "<tr><td><b>" + timestamp + " (JST)</b><i class=\"fa fa-refresh fa-spin\"></i></td><td><p><b>" + receiver + "</b><i class=\"fa fa-refresh fa-spin\"></i></p><p>Eメール認証</p></td></tr>";
    $("#cc-processed-receivers").append(info);
}
