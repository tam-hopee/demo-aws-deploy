// CloudContract Pages:
// - index.html
var account, apigClient;
window.onload = async() => {
    $("#header").load("./header.html");
    $("#footer").load("./footer.html");
    $("#sidebar").load("./sidebar.html", null, function() {
        $("#docs-dismissal").addClass("m_dismissal_active");
    });
    account = new Account();
    var token = await account.getToken();
    var authInfo = await account.getAuthInfo();
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
        apigClient.documentSendGet(params = {
            status: "dismissal",
            folderid: ""
        }, {}).then(function(result) {
            getdocslist(JSON.parse(result.data.body).Items, "sender");
            $(".overlay").attr("style", "display: none;");
            $(".cc-sender-count").text(JSON.parse(result.data.body).Count);
        }).catch(function(result) {
            erralert(result);
        });
        apigClient.documentReceiverGet(params = {
            status: "dismissal",
            key: "",
            folderid: ""
        }, {}).then(function(result) {
            getdocslist(JSON.parse(result.data.body).Items, "receiver");
            $(".overlay").attr("style", "display: none;");
            $(".cc-receiver-count").text(JSON.parse(result.data.body).Count);
        }).catch(function(result) {
            erralert(result);
        });
        // 社内稟議での却下一覧
        apigClient.documentSendGet(params = {
            status: "reject",
            folderid: ""
        }, {}).then(function(result) {
            getdocslist(JSON.parse(result.data.body).Items, "review");
            $(".overlay").attr("style", "display: none;");
        }).catch(function(result) {
            erralert(result);
        });
    }
}

function getdocslist(json, type) {
    var ele = "";
    var table = "";
    if (type == "sender") {
        ele = "#cc-docslist-sender";
        table = "#cc-sender-table";
    } else if (type == "receiver") {
        ele = "#cc-docslist-receiver";
        table = "#cc-receiver-table";
    } else if (type == "review") {
        ele = "#cc-docslist-review";
        table = "#cc-review-table";
    }
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
        // 送信・社内稟議の場合は送信先一覧、受信の場合は依頼（送信）者を表示
        var labels = (type == "sender" || type == "review") ? receiver : v["sender"];
        let menuClass = "cc-dismissal-filelist"
        if (type === "sender") {
            menuClass = "cc-dismissal-filelist"
        } else if(type === "receiver") {
            menuClass = "cc-dismissal-receive-filelist"
        } else {
            menuClass = "cc-dismissal-review-filelist"
        }
        $(ele).append(
            $('<tr class="' + menuClass + '" doc-id="' + v["key"] + '">').append(
                $('<td>').append(v["filename"]),
                $('<td>').append(labels),
                $('<td>').append(timestampConvertor(v["timestamp"])),
                $('<td>').append(button),
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
        selector: '.cc-dismissal-filelist',
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
        selector: '.cc-dismissal-receive-filelist',
        callback: function(key, options) {
            var docid = $(this).attr("doc-id");
            if (key == "view") {
                location.href = './preview.html?key=' + docid;
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

$(function() {
    $.contextMenu({
        selector: '.cc-dismissal-review-filelist',
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
    apigClient.documentSendDelete({}, {
        key: self.documentInfo.id
    }).then(function(result) {
        var res = JSON.parse(result.data.body);
        if (res.result === "invalid") {
            alert("既に契約書が処理されているため削除できません。");
        }
        location.reload();
    }).catch(function(result) {
        erralert(result);
    });
}
