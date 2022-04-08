// CloudContract Pages:
// - index.html
var account, apigClient;
window.onload = async() => {
    $("#header").load("./header.html");
    $("#footer").load("./footer.html");
    $("#sidebar").load("./sidebar.html", null, function() {
        $("#docs-review").addClass("m_review_active");
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
        // 送信タブ
        apigClient.documentSendGet(params = {
            status: "review",
            folderid: ""
        }, {}).then(function(result) {
            getdocslist(JSON.parse(result.data.body).Items, "sender");
            $(".overlay").attr("style", "display: none;");
        }).catch(function(result) {
            erralert(result);
        });
        // 受信タブ
        apigClient.documentReviewerGet(params = {
            status: "review",
            key: "",
            folderid: ""
        }, {}).then(function(result) {
            getdocslist(JSON.parse(result.data.body).Items, "receiver");
            $(".overlay").attr("style", "display: none;");
        }).catch(function(result) {
            // TODO: エラー発生時の処理
            console.log(result);
        });
    }
}

function getdocslist(json, type) {
    let ele = (type == "sender") ? "#cc-docslist-sender" : "#cc-docslist-receiver";
    let table = (type == "sender") ? "#cc-sender-table" : "#cc-receiver-table";
    $(ele).empty();
    json.forEach(function(v, i) {
        var button = '<button type="button" onclick="location.href= \'./preview.html?key=' + v["key"] + '\'" class="btnBase">確認する</button>';
        var receiver = '';
        if (typeof v["receiver"] === typeof []) {
            // 配列の場合（＝複数者間契約の実装リリース後に発生するパターン）
            v["receiver"].forEach(function(val) {
                receiver += val + "<br/>";
            });
        } else {
            receiver = v["receiver"];
        }
        let menuClass = (type == "sender") ? "cc-sent-filelist" : "cc-receive-filelist";
        $(ele).append(
            $('<tr class="' + menuClass + '" doc-id="' + v["key"] + '">').append(
                $('<td>').append(v["filename"]),
                $('<td>').append(receiver),
                //$('<td>').append(timestampConvertor(v["expiretime"])),
                $('<td>').append(timestampConvertor(v["timestamp"])),
                $('<td>').append(button)
            )
        );

    });
    $(table).find('th').unbind();
    $(table).tablesorter({
        sortList: [
            [2, 1]
        ],
        headers: {
            2: {
                sorter: 'date'
            },
            3: {
                sorter: false
            },
        }
    });
    $(table).trigger("updateAll", [true, function() {}]);
}

// Context Menu.
// Ref. https://swisnl.github.io/jQuery-contextMenu/
$(function() {
    $.contextMenu({
        selector: '.cc-sent-filelist',
        callback: function(key, options) {
            var docid = $(this).attr("doc-id");
            if (key == "view") {
                location.href = './preview.html?key=' + docid;
                return null
            }
            if (key == "delete") {
                self.documentInfo = {
                    id: $(this).attr("doc-id"),
                    name: $(this).attr("doc-name")
                }
                _open_delete_modal();
                return null
            }
        },
        items: {
            "view": {
                name: "確認する",
                icon: function() {
                    return 'context-menu-icon context-menu-icon--fa fa-file-pdf-o';
                }
            },
            "delete": {
                name: "削除する",
                icon: function() {
                    return 'context-menu-icon context-menu-icon--fa fa-trash-o';
                }
            },
            "sep1": "---------",
            "quit": {
                name: "閉じる",
                icon: function() {
                    return 'context-menu-icon context-menu-icon-quit';
                }
            }
        }
    });
});

$(function() {
    $.contextMenu({
        selector: '.cc-receive-filelist',
        callback: function(key, options) {
            var docid = $(this).attr("doc-id");
            if (key == "view") {
                location.href = './preview.html?key=' + docid;
                return null
            }
            if (key == "delete") {
                self.documentInfo = {
                    id: $(this).attr("doc-id"),
                    name: $(this).attr("doc-name")
                }
                _open_delete_modal();
                return null
            }
        },
        items: {
            "view": {
                name: "確認する",
                icon: function() {
                    return 'context-menu-icon context-menu-icon--fa fa-file-pdf-o';
                }
            },
            "sep1": "---------",
            "quit": {
                name: "閉じる",
                icon: function() {
                    return 'context-menu-icon context-menu-icon-quit';
                }
            }
        }
    });
});

function _open_delete_modal() {
    // close modal and loading
    $("#modal-doc-name").text(self.documentInfo.name);
    $("#modal-default").attr("class", "modal fade in").attr("style", "display: block;");
}

function _close_delete_modal() {
    // close modal and loading
    $("#modal-default").attr("class", "modal fade").attr("style", "display: none;");
}

function deleteDocument() {
    apigClient.documentReviewerDelete({}, {
        key: self.documentInfo.id
    }).then(function(result) {
        location.reload();
    }).catch(function(result) {
        erralert(result);
    });
}
