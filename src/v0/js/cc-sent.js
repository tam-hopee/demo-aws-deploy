// CloudContract Pages:
// - index.html
var account, apigClient, documentInfo;
window.onload = async() => {
    $("#header").load("./header.html");
    $("#footer").load("./footer.html");
    $("#sidebar").load("./sidebar.html", null, function() {
        $("#docs-sent").addClass("m_confirm_active");
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
        apigClient.documentSendGet(params = {
            status: "sent",
            folderid: ""
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
        var button = '<button type="button" onclick="location.href= \'./preview.html?key=' + v["key"] + '\'" class="btnBase">確認する</button>';
	    var resend_button = '<button type="button" onclick="_open_resend_modal(\'' + v["key"] +'\''+ ',' +'\''+ v["receiver"] + '\')" class="btnBase">再送する</button>';

        var receiver = '';
        if (typeof v["receiver"] === typeof []) {
            // 配列の場合（＝複数者間契約の実装リリース後に発生するパターン）
            v["receiver"].forEach(function(val) {
                receiver += val + "<br/>";
            });
        } else {
            receiver = v["receiver"];
        }
        // 社内稟議機能対応：稟議ありの場合はレビュー完了日時をメール送信日時とする
        let senttime = (v["reviewedtime"]) ? v["reviewedtime"] : v["createdtime"];
        $("#cc-docslist").append(
            $('<tr class="cc-sent-filelist" doc-id="' + v["key"] + '" doc-name="' + v["filename"] + '" receiver-email="' + v["receiver"] + '">').append(
                $('<td>').append(v["filename"]),
                $('<td>').append(receiver),
                $('<td>').append(timestampConvertor(v["expiretime"])),
                $('<td>').append(timestampConvertor(senttime)),
                $('<td>').append(button),
                $('<td>').append(resend_button)
            )
        );
    });
    let table = '#cc-sent-table';
    $(table).find('th').unbind();
    $(table).tablesorter({
        sortList: [
            [3, 1]
        ],
        headers: {
            2: {
                sorter: 'date'
            },
            3: {
                sorter: 'date'
            },
            4: {
                sorter: false
            },
            5: {
                sorter: false
            },
        }
    });
    $(table).trigger("updateAll", [true, function() {}]);
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

function resendDocument() {
    // ボタンを送信中にする
    $("#cc-cancelBtn").attr("disabled", true);
    $("#resend-btn > i").attr("style", "margin-right:10px;");
    $("#resend-btn > span").text("送信中");
    $("#resend-btn").prop("disabled", true);
    let key = $("#resend-key").val();
    let receiverEmail = $("#resend-email").val();
	return new Promise((resolve, reject) => {
		apigClient.documentSendPatch({}, {
			key: key,
			receiver: receiverEmail,
			sender: this.sender,
			type: this.type
		}).then(function () {
			resendMailPost(key, receiverEmail);
		}).catch(function (result) {
			reject(result);
			erralert(result);
		}).finally(function () {
			//_close_resend_modal();
		});
	});
}

function resendMailPost(key, receiver) {
	return new Promise((resolve, reject) => {
		apigClient.sendmailAuthPost({}, {
			keys: [key],
			receiver: receiver
		}).then(function(result) {
			resolve(result);
		}).catch(function(result) {
			reject(result);
			erralert(result);
		}).finally(function () {
			location.reload();
		});
	});
}

// 一覧上に表示されたファイル行を押下した時の処理
$(document).on("click", ".cc-sent-filelist", function() {
    // 再送ボタンを追加するので無効化
    // var key = $(this).attr("doc-id");
    // location.href = './preview.html?key=' + key;
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

function _open_resend_modal(key, email) {
    $("#resend-key").attr("value", key);
    $("#resend-email").attr("value", email);
    $("#modal-resend").attr("class", "modal fade in").attr("style", "display: block;");
}

function _close_resend_modal() {
    // close modal and loading
    $("#modal-resend").attr("class", "modal fade").attr("style", "display: none;");
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
            if (key == "resend") {
                var key = $(this).attr("doc-id");
                var email = $(this).attr("receiver-email");
                _open_resend_modal(key, email);
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
            "resend": {
                name: "再送する",
                icon: function() {
                    return 'context-menu-icon context-menu-icon--fa fa-send-o';
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
