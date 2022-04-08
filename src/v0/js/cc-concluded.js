// CloudContract Pages:
// - index.html
var account, apigClient, targetFolder = {},
	moveTargetType, targetFileId, targetFolderId, targetElement, receiverCode;
window.onload = async() => {
    $("#header").load("./header.html");
    $("#footer").load("./footer.html");
    $("#sidebar").load("./sidebar.html", null, function() {
        $("#docs-concluded").addClass("m_concluded_active");
    });
    account = new Account();
    var token = await account.getToken();
    var authInfo = await account.getAuthInfo();
    if (token === null) {
        window.location.href = cclogin_page;
        document.querySelector('#ccerror').style.display = 'block';
    } else {
        $(".cc-uname").text(account.cognitoUser.username)
        myCrypto(account.cognitoUser.username).then(function(key) {
            this.receiverCode = key;
        });
        apigClient = apigClientFactory.newClient({
            accessKey: authInfo.accessKeyId,
            secretKey: authInfo.secretAccessKey,
            sessionToken: authInfo.sessionToken,
            apiKey: authInfo.apikey,
            region: authInfo.region
        });
        getSwitchUser();
        // 送信・受信共にルートディレクトリを取得
        apigClient.folderGet(params = {
            status: "active",
            parentfolderid: "",
            tab: "",
        }, {}).then(function(result) {
            // まずはフォルダ一覧を表示
            getfolderlist(JSON.parse(result.data.body).Items);

            // その後にフォルダに入っていないファイルを一覧表示
            // 送信タブ
            apigClient.documentSendGet(params = {
                status: "concluded",
                folderid: "",
            }, {}).then(function(result) {
                getdocslist(JSON.parse(result.data.body).Items, "sender");
                _close();
                //$(".cc-sender-count").text(JSON.parse(result.data.body).Count);
            }).catch(function(result) {
                erralert(result);
            });
            // 受信タブ
            apigClient.documentReceiverGet(params = {
                status: "concluded",
                key: "",
                folderid: "",
            }, {}).then(function(result) {
                getdocslist(JSON.parse(result.data.body).Items, "receiver");
                _close();
                //$(".cc-receiver-count").text(JSON.parse(result.data.body).Count);
            }).catch(function(result) {
                erralert(result);
            });
            // アップロードタブ
            apigClient.documentOriginalGet(params = {
                status: "concluded",
                folderid: "",
                etag: "",
            }, {}).then(function(result) {
                getuploadlist(JSON.parse(result.data.body).Items);
                _close();
            }).catch(function(result) {
                erralert(result);
            });
        });
    }
}

function getdocslist(json, type) {
    var ele = (type == "sender") ? "#cc-docslist-sender" : "#cc-docslist-receiver";
    var table = (type == "sender") ? "#cc-sender-table" : "#cc-receiver-table";
    json.forEach(function(v, i) {
        var button = '<button type="button" onclick="" class="btnOpen">開く</button>';
        var receiver = '';
        if (typeof v["receiver"] === typeof []) {
            // 配列の場合（＝複数者間契約の実装リリース後に発生するパターン）
            v["receiver"].forEach(function(val) {
                receiver += val + "<br/>";
            });
        } else {
            receiver = v["receiver"];
        }
        // 送信の場合は送信先一覧、受信の場合は依頼（送信）者を表示
        var labels = (type == "sender") ? receiver : v["sender"];
        if (type == "sender") {
            $(ele).append(
                $('<tr class="context-menu-one" doc-id="' + v["key"] + '">').append(
                    $('<td>').append('<i class="fa fa-fw fa-file-pdf-o"></i> ' + v["filename"]),
                    $('<td>').append(labels),
                    $('<td>').append(timestampConvertor(v["timestamp"])),
                    $('<td class="timer-text">').append('<input type="text" name="contract-endtime" value="' + getNotifyTime(v, "endtime") +'" class="contract-endtime" doc-id="' + v["key"] + '" readonly="readonly">'),
                    $('<td class="timer-text">').append('<input type="text" name="contract-alerttime" value="' + getNotifyTime(v, "alerttime") +'" class="contract-alerttime" doc-id="' + v["key"] + '" readonly="readonly">'),
                    $('<td>').append(button),
                )
            );
        } else {
            $(ele).append(
                $('<tr class="context-menu-one" doc-id="' + v["key"] + '">').append(
                    $('<td>').append('<i class="fa fa-fw fa-file-pdf-o"></i> ' + v["filename"]),
                    $('<td>').append(labels),
                    $('<td>').append(timestampConvertor(v["timestamp"])),
                    $('<td>').append(button),
                )
            );
        }
    });
	$(table).find('th').unbind();
	if (type == "sender") {
		$.tablesorter.addParser({
			id: 'inputs',
			is: function (s) {
				return false;
			},
			format: function (s, table, cell) {
				var $c = $(cell);
				return $c.find('input').val();
			},
			type: 'text'
		});
		$(table).tablesorter({
			sortList: [
				[2, 1]
			],
			headers: {
				2: {
					sorter: 'date'
				},
				3: {
					sorter: 'inputs'
				},
				4: {
					sorter: 'inputs'
				},
				5: {
					sorter: false
				},
			}
		});
	} else {
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
	}
    $(table).trigger("updateAll", [true, function() {}]);
}

function getNotifyTime (v, key) {
    if (key in v) {
        let isExists = v[key]
        if (!isExists) {
            return "";
        }
        return timestampConvertorYYMMDD(v[key])
    }
    return ""
}

function getfolderlist(json) {
    json.forEach(function(v, i) {
        var type = v["tab"];
        var ele = "";
        if (type == "sender") {
            ele = "#cc-docslist-sender";
        } else if (type == "receiver") {
            ele = "#cc-docslist-receiver";
        } else if (type == "upload") {
            ele = "#cc-docslist-upload";
        } else {
            return
        }
        var button = '<button type="button" class="btnOpen">開く</button>';
        if (type == "sender") {
            $(ele).append(
                $('<tr class="cc-folder-item" folder-id="' + v['folderid'] + '" folder-createdtime="' + v['createdtime'] + '">').append(
                    $('<td>').append('<i class="fa fa-fw fa-folder-o"></i> <span>' + v["foldername"] + '</span>'),
                    $('<td>').append('-'),
                    $('<td>').append('-'),
                    $('<td>').append('<input type="hidden">'),
                    $('<td>').append('<input type="hidden">'),
                    $('<td>').append(button),
                )
            );
        } else {
            $(ele).append(
                $('<tr class="cc-folder-item" folder-id="' + v['folderid'] + '" folder-createdtime="' + v['createdtime'] + '">').append(
                    $('<td>').append('<i class="fa fa-fw fa-folder-o"></i> <span>' + v["foldername"] + '</span>'),
                    $('<td>').append('-'),
                    $('<td>').append('-'),
                    $('<td>').append(button),
                )
            );
        }
    });
}

function gettrush(json) {
    $("#cc-docslist-trush").children().remove();
    json.forEach(function(v, i) {
        $("#cc-docslist-trush").append(
            $('<tr class="cc-folder-item-trush" folder-id="' + v['folderid'] + '" folder-createdtime="' + v['createdtime'] + '" folder-tab="' + v['tab'] + '">').append(
                $('<td>').append('<i class="fa fa-fw fa-folder-o"></i> <span>' + v["foldername"] + '</span>'),
                $('<td>').append('<span>' + timestampConvertor(v["timestamp"]) + '</span>'),
            )
        );
    });
    let table = '#cc-trush-table';
    $(table).find('th').unbind();
    $(table).tablesorter({
        sortList: [
            [1, 1]
        ],
        headers: {
            1: {
                sorter: 'date'
            },
        }
    });
    $(table).trigger("updateAll", [false, function() {}]);
}

function getuploadlist(json) {
    var ele = "#cc-docslist-upload";
    var table = "#cc-upload-table";
    json.forEach(function(v, i) {
        var button = '<button type="button" onclick="" class="btnOpen">開く</button>';
        $(ele).append(
            $('<tr class="cc-uploadtab-item" doc-id="' + v["etag"] + '">').append(
                $('<td>').append('<i class="fa fa-fw fa-file-pdf-o"></i> ' + v["filename"]),
                $('<td>').append(timestampConvertor(v["filetimestamp"])),
                $('<td>').append(timestampConvertor(v["createdtime"])),
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
            1: {
                sorter: 'date'
            },
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

function clickGeneFolder(type) {
    $("#cc-gene-folder-btn").prop('disabled', true);
    $("#cc-folder-name").keyup(function() {
        if ($("#cc-folder-name").val() == "") $("#cc-gene-folder-btn").prop('disabled', true);
        else $("#cc-gene-folder-btn").prop('disabled', false);
    });

    var modal = (type) => {
        if (type === "none") _close();
        else $("#modal-default").attr("class", "modal fade in").attr("style", "display: block; z-Index: 2070;");
    }
    if (type === "cancel") modal("none");
    else if (type === "done") GeneFolder();
    else modal();
}

function clickRenameFolder(type, info) {
    $("#cc-rename-folder-btn").prop('disabled', true);
    $("#cc-folder-rename").keyup(function() {
        if ($("#cc-folder-rename").val() == "") $("#cc-rename-folder-btn").prop('disabled', true);
        else $("#cc-rename-folder-btn").prop('disabled', false);
    });

    var modal = (type) => {
        if (type === "none") _close();
        else $("#modal-folder-rename").attr("class", "modal fade in").attr("style", "display: block; z-Index: 2070;");
    }
    if (type === "cancel") modal("none");
    else if (type === "init") {
        modal();
        $("#cc-folder-rename").val(info.fname);
        $("#cc-folder-rename-id").val(info.fid);
        $("#cc-folder-rename-createdtime").val(info.createdtime);
    } else if (type === "done") renameFolder($("#cc-folder-rename-id").val(), $("#cc-folder-rename-createdtime").val(), $("#cc-folder-rename").val());
    else modal();
}

function GeneFolder() {
    if ($("#cc-folder-name").val() == "") {
        // null check
        return null;
    }
    $(".overlay").attr("style", "display: block;");
    var name = $("#cc-folder-name").val();
    var tab = checkActiveTab();
    var parentfolderid = "";
    if (tab === "sender") {
        parentfolderid = (self.targetFolder.sender_parentfolderid) ? self.targetFolder.sender_parentfolderid : "";
    } else if (tab === "receiver") {
        parentfolderid = (self.targetFolder.receiver_parentfolderid) ? self.targetFolder.receiver_parentfolderid : "";
    } else if (tab === "upload") {
        parentfolderid = (self.targetFolder.upload_parentfolderid) ? self.targetFolder.upload_parentfolderid : "";
    }
    apigClient.folderPost(params = {}, {
        name: name,
        tab: tab,
        parentfolderid: parentfolderid,
    }).then(function(result) {
        getList(parentfolderid, tab);
        _close();
    }).catch(function(result) {
        // TODO: エラー発生時の処理
        console.log(result);
        _close();
    });
}

function checkActiveTab() {
    let checkedTab = $('input[name=tab_item]:checked').val();
    if (checkedTab === "sender" || checkedTab === "upload") {
        return checkedTab
    } else {
        return null;
    }
}

function _close() {
    // close modal and loading
    $("#cc-folder-name").val("");
    $(".overlay").attr("style", "display: none;");
    $("#modal-default").attr("class", "modal fade").attr("style", "display: none;");
    $("#modal-folder-rename").attr("class", "modal fade").attr("style", "display: none;");
    $("#modal-folder-list").attr("class", "modal fade").attr("style", "display: none;");
    $("#cc-folder-list-modal").children().remove();
}

function moveFile(type) {
    var modal = (type) => {
        if (type === "none") {
            _close();
        }else {
            // ファイルをフォルダに移動するビューをモーダル表示
            $("#modal-folder-list-title").text("フォルダ取得中");
            $("#modal-folder-list").attr("class", "modal fade in").attr("style", "display: block; z-Index: 2070;");
            var tab = checkActiveTab();
            _movefile("", tab);
        }
    }
    if (type === "cancel") modal("none");
    else modal();
}

function _movefile(id, tab) {
    apigClient.folderGet(params = {
        status: "active",
        parentfolderid: id,
        tab: tab,
    }, {}).then(function(result) {
        $("#cc-folder-list-modal").children().remove();
        // フォルダ一覧の表示
        var folders = JSON.parse(result.data.body).Items;
        folders.forEach(function(v, i) {
            if (tab == v['tab']) {
                // 移動可能なfolderか判定(フォルダ毎移動時に自フォルダ配下には移動できないため自フォルダは非表示とする)
				if (self.moveTargetType === "folder" && self.targetFolderId === v["folderid"]) {
					return;
				}
                $("#cc-folder-list-modal").append(
                    $('<tr class="cc-movefile" folder-id="' + v['folderid'] + '">').append(
                        $('<td>').append('<i class="fa fa-fw fa-folder-o"></i> <span>' + v['foldername'] + '</span>'),
                    )
                )
            }
        });
        $("#modal-folder-list-title").text("移動先のフォルダを選択してください。");

        // パンくずをセットする。
        var func = "_movefile('', \'" + tab + "\')";
        $("#cc-folderbreadcrumb-modal > li > a").attr("onclick", func);
        folderbreadcrumb(id).then((data) => {
            $("#cc-folderbreadcrumb-modal").find(".children").remove();
            data.forEach(function(v, i) {
                $("#cc-folderbreadcrumb-modal").append('<li class="active children"><a href="#" onclick="_movefile(\'' + v["id"] + '\',\'' + v["tab"] + '\');">' + v["name"] + '</a></li>')
            });
        });

        // 「ここに移動する」ボタンに関数をセットする。
        var func = "clickMoveFile('" + id + "');";
        $("#cc-move-folder-btn").attr("onclick", func);
    });
}

function clickMoveFile(id) {
	var type = self.moveTargetType;
	var key='';
	if (type==='file') {
		key=self.targetFileId
	} else {
		key=self.targetFolderId
	}
	
	$("#cc-move-folder-btn").prop("disabled", true);
    if (!id) id = ''; // ルートディレクトリの場合
    if (key) {
        var tab = checkActiveTab();
        // ファイル移動処理（データモデルとしては、フォルダIDを付与する処理）
        apigClient.folderMovePost({}, {
            "type": type,
            "tab": tab,
            "key": key,
            "folderid": id,
            "receiver": this.receiverCode
        }).then(function(result) {
            // var res = JSON.parse(result.data.body);
            // モーダルを閉じて、移動先のフォルダを開く
            $("#cc-move-folder-btn").prop("disabled", false);
            _close();
            getList(id, tab);
        }).catch(function(result) {
            erralert(result);
        });
    }
}

function folderbreadcrumb(folderid) {
    return new Promise((resolve, reject) => {
        if (folderid) {
            apigClient.folderMoveGet(params = {
                folderid: folderid,
            }, {}).then(function(result) {
                resolve(JSON.parse(result.data.body).reverse());
            }).catch(function(err) {
                reject(err);
            });
        } else {
            resolve([]);
        }
    })
}

function getList(folderid, type) {
    // パンくず取得
    var ele = "";
    if (type == "sender") {
        ele = "#cc-folderbreadcrumb-sender";
    } else if (type == "receiver") {
        ele = "#cc-folderbreadcrumb-receiver";
    } else if (type == "upload") {
        ele = "#cc-folderbreadcrumb-upload";
    } else {
        return
    }
    folderbreadcrumb(folderid).then((data) => {
        $(ele).find(".children").remove();
        data.forEach(function(v, i) {
            $(ele).append('<li class="active children"><a href="#" onclick="getList(\'' + v["id"] + '\',\'' + v["tab"] + '\');">' + v["name"] + '</a></li>')
        });
    });

    // フォルダ多段構造の対応
    if (type == "sender") {
        // 送信箱
        self.targetFolder.sender_parentfolderid = folderid
    } else if (type == "receiver") {
        // 受信箱
        self.targetFolder.receiver_parentfolderid = folderid
    } else if (type == "upload") {
        // アップロード
        self.targetFolder.upload_parentfolderid = folderid
    }

    $(".overlay").attr("style", "display: block;");
    if (type == "sender") {
        $("#cc-docslist-sender").children().remove();
        // 送信タブで指定フォルダ配下を取得
        apigClient.folderGet(params = {
            status: "active",
            parentfolderid: folderid,
            tab: type,
        }, {}).then(function(result) {
            // まずはフォルダ一覧を表示
            getfolderlist(JSON.parse(result.data.body).Items);
            apigClient.documentSendGet(params = {
                status: "concluded",
                folderid: folderid,
            }, {}).then(function(result) {
                var json = JSON.parse(result.data.body).Items;
                getdocslist(json, type);
                _close();
            }).catch(function(result) {
                erralert(result);
            });
        });
    } else if (type == "receiver") {
        $("#cc-docslist-receiver").children().remove();
        // 受信タブで指定フォルダ配下を取得
        apigClient.folderGet(params = {
            status: "active",
            parentfolderid: folderid,
            tab: type,
        }, {}).then(function(result) {
            // まずはフォルダ一覧を表示
            getfolderlist(JSON.parse(result.data.body).Items);
            apigClient.documentReceiverGet(params = {
                status: "concluded",
                key: "",
                folderid: folderid,
            }, {}).then(function(result) {
                var json = JSON.parse(result.data.body).Items;
                getdocslist(json, type);
                _close();
            }).catch(function(result) {
                erralert(result);
            });
        });
    } else if (type == "upload") {
        $("#cc-docslist-upload").children().remove();
        // アップロードタブで指定フォルダ配下を取得
        apigClient.folderGet(params = {
            status: "active",
            parentfolderid: folderid,
            tab: type,
        }, {}).then(function(result) {
            // まずはフォルダ一覧を表示
            getfolderlist(JSON.parse(result.data.body).Items);
            apigClient.documentOriginalGet(params = {
                status: "concluded",
                folderid: folderid,
                etag: "",
            }, {}).then(function(result) {
                getuploadlist(JSON.parse(result.data.body).Items);
                _close();
            }).catch(function(result) {
                account.showMessage(JSON.stringify(result), "alert-danger", "#message_docsPost")
                _close();
            });
        })
    }
}

function updateFolder(info, status) {
    apigClient.folderPut(params = {}, {
        foldername: info.fname,
        createdtime: info.createdtime,
        status: status,
    }).then(function(result) {
        (self.targetElement).remove(); // ターゲットの要素を削除
        $("#cc-sender-table,#cc-receiver-table,#cc-upload-table").trigger("updateAll", [false, function() {}]);
    }).catch(function(result) {
        // TODO: エラー発生時の処理
        console.log(result);
    });
}

function renameFolder(folderid, createdtime, name) {
    apigClient.folderPut(params = {}, {
        foldername: name,
        createdtime: createdtime,
        status: "active",
    }).then(function(result) {
        (self.targetElement).find("td:eq(0) > span").text(name); // ターゲットのフォルダ名を変更
        $("#cc-sender-table,#cc-receiver-table,#cc-upload-table").trigger("updateAll", [false, function() {}]);
        _close();
    }).catch(function(result) {
        // TODO: エラー発生時の処理
        console.log(result);
        _close();
    });
}

function getCurrentFolderName(currentFolderId) {
	return new Promise((resolve, reject) => {
		if (currentFolderId) {
			apigClient.folderMoveGet(params = {
				folderid: currentFolderId,
			}, {}).then(function(result) {
				let body = JSON.parse(result.data.body);
				resolve(body[0]['name']);
			}).catch(function(err) {
				reject(err);
			});
		} else {
			resolve("");
		}
	})
}

function clickCsvDownload() {
    let tab = checkActiveTab();
    let csvheader = '"名前","送信先","最終処理日","フォルダ名"\n';
	if (tab === "sender") {
		let currentFolderId = (self.targetFolder.sender_parentfolderid) ? self.targetFolder.sender_parentfolderid : "";
		getCurrentFolderName(currentFolderId).then((currentFolderName) => {
			apigClient.documentSendGet(params = {
				status: "concluded",
				folderid: currentFolderId,
			}, {}).then(function (result) {
                let data=[];
                data.push(csvheader);
				let docs = JSON.parse(result.data.body).Items;
				docs.forEach(function(v, i) {
                    let _receiver = (typeof v["receiver"] === typeof []) ? v['receiver'].join('|') : v['receiver'];
					let line = '"' + v['filename'] + '","' + _receiver + '","' + timestampConvertor(v['timestamp']) +'","' + currentFolderName + '"\n';
					data.push(line);
				});
				downloadCsv(data);
			}).catch(function(result) {
				erralert(result);
			});
		});
	} else if (tab === "receiver") {
		let currentFolderId = (self.targetFolder.receiver_parentfolderid) ? self.targetFolder.receiver_parentfolderid : "";
		getCurrentFolderName(currentFolderId).then((currentFolderName) => {
			apigClient.documentReceiverGet(params = {
				status: "concluded",
				key: "",
				folderid: currentFolderId,
			}, {}).then(function(result) {
                let data=[];
                data.push(csvheader);
				let docs = JSON.parse(result.data.body).Items;
				docs.forEach(function(v, i) {
					let line = '"' + v['filename'] + '","' + v['sender'] + '","' + timestampConvertor(v['timestamp']) +'","' + currentFolderName + '"\n';
					data.push(line);
				});
				downloadCsv(data);
			}).catch(function(result) {
				erralert(result);
			});
		});
	}
}

function downloadCsv(data) {
	let blob = new Blob(data, {
		type: "text/csv;charset=utf-8"
	});
	
	let fileName = Date.now() + '.csv';
	if (window.navigator.msSaveBlob) {
	    // ie
		window.navigator.msSaveBlob(blob, fileName);
		window.navigator.msSaveOrOpenBlob(blob, fileName);
	} else {
	    // chrome
		let a = document.createElement('a');
		a.download = fileName;
		a.href = URL.createObjectURL(blob);
		a.click();
	}
}

// Context Menu.
// Ref. https://swisnl.github.io/jQuery-contextMenu/
$(function() {
    $.contextMenu({
        selector: '.context-menu-one',
        callback: function(key, options) {
            var docid = $(this).attr("doc-id");
            if (key == "view") {
                location.href = './preview.html?key=' + docid;
                return null
            }
            if (key == "folder") {
				self.moveTargetType = 'file'; // Global
                self.targetFileId = docid; // Global
                moveFile();
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
            "folder": {
                name: "移動する",
                icon: function() {
                    return 'context-menu-icon context-menu-icon--fa fa-arrow-right';
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

    $.contextMenu({
        selector: '.cc-uploadtab-item',
        callback: function(key, options) {
            var docid = $(this).attr("doc-id");
            if (key == "view") {
                location.href = './preview.html?etag=' + docid;
                return null
            }
            if (key == "folder") {
				self.moveTargetType = 'file'; // Global
                self.targetFileId = docid; // Global
                moveFile();
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
            "folder": {
                name: "移動する",
                icon: function() {
                    return 'context-menu-icon context-menu-icon--fa fa-arrow-right';
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

    $.contextMenu({
        selector: '.cc-folder-item',
        callback: function(key, options) {
			var folderId = $(this).attr("folder-id");
            self.targetElement = $(this); // Global
            var info = {
                fid: $(this).attr("folder-id"),
                fname: $(this).find("td:eq(0) > span").text(),
                createdtime: $(this).attr("folder-createdtime")
            };
            if (key == "open") {
                getList(info.fid, checkActiveTab());
                return null
            }
            if (key == "rename") {
                clickRenameFolder("init", info);
                return null
            }
            if (key == "delete") {
                updateFolder(info, "deactive");
                return null
            }
			if (key == "folder") {
				var folderid = $(this).attr("folder-id");
				self.moveTargetType = 'folder'; // Global
			    self.targetFolderId = folderid; // Global
				moveFile();
				return null
			}
        },
        items: {
            "open": {
                name: "開く",
                icon: function() {
                    return 'context-menu-icon context-menu-icon--fa fa-folder-open';
                }
            },
            "rename": {
                name: "フォルダ名を変更する",
                icon: function() {
                    return 'context-menu-icon context-menu-icon--fa fa-edit';
                }
            },
			"folder": {
				name: "移動する",
				icon: function() {
					return 'context-menu-icon context-menu-icon--fa fa-arrow-right';
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

    $.contextMenu({
        selector: '.cc-folder-item-trush',
        callback: function(key, options) {
            self.targetElement = $(this); // Global
            var info = {
                fid: $(this).attr("folder-id"),
                fname: $(this).find("td:eq(0) > span").text(),
                createdtime: $(this).attr("folder-createdtime"),
                tab: $(this).attr("folder-tab"),
            };
            if (key == "back") {
                $(".overlay").attr("style", "display: block;");
                apigClient.folderMoveGet(params = {
                    folderid: info.fid,
                }, {}).then(function(result) {
                    var res = JSON.parse(result.data.body)[0];
                    if (res.result === "warning") {
                        // 親フォルダの存在チェック
                        var message = "親フォルダ [" + res.targetfoldername + "] が削除されているので元に戻せません。親フォルダを先に戻してから再度お試しください。";
                        alert(message);
                    } else {
                        updateFolder(info, "active");
                        getList(info.fid, info.tab);
                        var ele = "";
                        if (info.tab == "sender") {
                            ele = "#cc-sender-tab > a";
                        } else if (info.tab == "receiver") {
                            ele = "#cc-receiver-tab > a";
                        } else if (info.tab == "upload") {
                            ele = "#cc-upload-tab > a";
                        }
                        $(ele).click();
                    }
                    _close();
                }).catch(function(err) {
                    erralert(err);
                    _close();
                });
                return null
            }
        },
        items: {
            "back": {
                name: "元に戻す",
                icon: function() {
                    return 'context-menu-icon context-menu-icon--fa fa-refresh';
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

// 一覧上に表示されたテキスト(契約終了日)を押下した時の処理
$(document).on("click", ".contract-endtime", function() {
    $(this).datepicker({
        dateFormat: 'yy-mm-dd',
        onSelect: function(endTime) {
            let docId = $(this).attr("doc-id");
            let alertTime = $(this).closest('tr').find('input[name=contract-alerttime]').val();
            updateNotifyTime(docId, endTime, alertTime);
        },
        showButtonPanel: true,
        closeText: 'Clear',
        onClose: function (dateText, inst) {
            if ($(window.event.srcElement).hasClass('ui-datepicker-close')) {
                document.getElementById(this.id).value = '';
                let docId = $(this).attr("doc-id");
                let alertTime = $(this).closest('tr').find('input[name=contract-alerttime]').val();
                updateNotifyTime(docId, null, alertTime);
            }
        }
    });
    $(this).datepicker("show");
    return false;
});

// 一覧上に表示されたテキスト(アラート日)を押下した時の処理
$(document).on("click", ".contract-alerttime", function() {
    $(this).datepicker({
        dateFormat: 'yy-mm-dd',
        onSelect: function(alertTime) {
            let docId = $(this).attr("doc-id");
            let endTime = $(this).closest('tr').find('input[name=contract-endtime]').val();
            updateNotifyTime(docId, endTime, alertTime);
        },
        showButtonPanel: true,
        closeText: 'Clear',
        onClose: function (alertTime) {
            if ($(window.event.srcElement).hasClass('ui-datepicker-close')) {
                document.getElementById(this.id).value = '';
                let docId = $(this).attr("doc-id");
                let endTime = $(this).closest('tr').find('input[name=contract-endtime]').val();
                updateNotifyTime(docId, endTime, null);
            }
        }
    });
    $(this).datepicker("show");
    return false;
});


// 一覧上に表示されたファイル行を押下した時の処理
$(document).on("click", ".context-menu-one", function(e) {
    // 契約終了日、アラートのtdの領域をクリックした場合、画面遷移させない
    if ($(e.target).hasClass("timer-text")) {
        return false;
    }
    var key = $(this).attr("doc-id");
    location.href = './preview.html?key=' + key;
});

// アップロードタブ一覧上に表示されたファイル行を押下した時の処理
$(document).on("click", ".cc-uploadtab-item", function() {
    var key = $(this).attr("doc-id");
    location.href = './preview.html?etag=' + key;
});

// 一覧上に表示されたフォルダー行を押下した時の処理
$(document).on("click", ".cc-folder-item", function() {
    var id = $(this).attr("folder-id");
    var tab = checkActiveTab();
    getList(id, tab);
});

// モーダル表示されたフォルダ一覧上での処理
$(document).on("click", ".cc-movefile", function() {
    var id = $(this).attr("folder-id");
    var tab = checkActiveTab();
    _movefile(id, tab);
});

$(document).on("click", "#trash", function() {
    $(".overlay").attr("style", "display: block;");
    // 削除状態のディレクトリを取得
    apigClient.folderGet(params = {
        status: "deactive",
        parentfolderid: "all",
        tab: "",
    }, {}).then(function(result) {
        gettrush(JSON.parse(result.data.body).Items);
        _close();
    }).catch(function(result) {
        erralert(result);
        _close();
    });
});

$(document).on("input", "#cc-doc-search", function() {
	var key =$("#cc-doc-search").val();
	if(key.length === 0){
		// Clear table
		$("#cc-docslist-sender tr").remove();
		$("#cc-docslist-receiver tr").remove();
		init();
	}
});

$('#cc-doc-search').keypress( function ( e ) {
	if ( e.which === 13 ) {
		var key =$("#cc-doc-search").val();
		if(key.length === 0){
			// Clear table
			$("#cc-docslist-sender tr").remove();
			$("#cc-docslist-receiver tr").remove();
			init();
		}else{
			search(key);
		}
	}
});

function init() {
    getSwitchUser();
	// 送信・受信共にルートディレクトリを取得
	apigClient.folderGet(params = {
		status: "active",
		parentfolderid: "",
		tab: "",
	}, {}).then(function(result) {
		// まずはフォルダ一覧を表示
		getfolderlist(JSON.parse(result.data.body).Items);
		
		// 送信タブ
		apigClient.documentSendGet(params = {
			status: "concluded",
			folderid: "",
		}, {}).then(function(result) {
			getdocslist(JSON.parse(result.data.body).Items, "sender");
			_close();
		}).catch(function(result) {
			erralert(result);
		});
		// 受信タブ
		apigClient.documentReceiverGet(params = {
			status: "concluded",
			key: "",
			folderid: "",
		}, {}).then(function(result) {
			getdocslist(JSON.parse(result.data.body).Items, "receiver");
			_close();
		}).catch(function(result) {
			erralert(result);
		});
	});
}

function search(keyword) {
	// Clear table
	$("#cc-docslist-sender tr").remove();
	$("#cc-docslist-receiver tr").remove();
	
	apigClient.documentSendSearchGet(params = {
		keyword: keyword,
	}, {}).then(function(result) {
		getdocslist(JSON.parse(result.data.body), 'sender');
		_close();
	}).catch(function(result) {
		erralert(result);
		_close();
	});
	apigClient.documentReceiverSearchGet(params = {
		keyword: keyword,
	}, {}).then(function(result) {
		getdocslist(JSON.parse(result.data.body), "receiver");
		_close();
	}).catch(function(result) {
		erralert(result);
	});
}


// アップロードタブ function

var uploadButton = document.getElementById('docsPost_btn');
uploadButton.addEventListener('click', function(e) {
    $("#message_docsPost").attr("style", "display:none;");
    $("#cc-fileInput").click();
})
document.getElementById("cc-fileInput").addEventListener("change", function(e) {
    try {
        var fileList = this.files;
        uploadFile(fileList);
    } catch (msg) {
        erralert(msg);
    }
})

function uploadFile(fileData) {
    var promises = [];
    for (var i = 0; i < fileData.length; i++) {
        var file = fileData[i];
        if (!file.type.match(/pdf$/)) {
            account.showMessage("PDFファイルを選択してください。[ " + file.name + " ]", "alert-danger", "#message_docsPost");
        } else if (file.size > 10 * 1000 * 1000) {
            account.showMessage("10MB以下のファイルを選択してください。[ " + file.name + " ]", "alert-danger", "#message_docsPost");
        } else {
            promises.push(_uploadfile(file));
        }
    }
    Promise.all(promises).then(function(results) {
        var folderid = (self.targetFolder.upload_parentfolderid) ? self.targetFolder.upload_parentfolderid : '';
        getList(folderid, "upload");
    }).catch(function(result) {
        _close();
        erralert(result);
    });
}

function _uploadfile(file) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onerror = function(result) {
            account.showMessage("エラーが発生しました。再度アップロードしてください。[ " + file.name + " ]", "alert-danger", "#message_docsPost");
            reject(result);
        }
        reader.onload = function(ev) {
            var params = {};
            var body = {
                data: ev.target.result,
                filename: file.name
            };
            // post pdf file to S3 bucket
            $(".overlay").attr("style", "display:block;");
            /// S3 File Upload.
            apigClient.documentPost(params, body).then(function(result) {
                var _key = JSON.parse(result.data.body).key;
                var _bucket = JSON.parse(result.data.body).Bucket;
                var len = _key.length - file.name.length;
                var s3dirc = _key.substr(0, len - 1); // S3のディレクトリ名を取得し、最後のスラッシュを削除
                var bucket = _bucket + "/" + s3dirc;
                var etag = (JSON.parse(result.data.body).ETag).replace(/\"/g, "");
                /// Dynamo Data Upload.
                apigClient.documentOriginalPost({}, {
                    etag: etag,
                    bucket: bucket,
                    filename: file.name,
                    filetimestamp: timestampToString(file.lastModifiedDate),
                    status: "concluded",
                }).then(function(result) {
                    var folderid = (self.targetFolder.upload_parentfolderid) ? self.targetFolder.upload_parentfolderid : '';
                    apigClient.folderMovePost({}, {
                        "type": "file",
                        "tab": "upload",
                        "key": etag,
                        "folderid": folderid,
                        "receiver": this.receiverCode
                    }).then(function(result) {
                        resolve(result);
                    }).catch(function(result) {
                        reject(result);
                    });
                }).catch(function(result) {
                    reject(result);
                });
            }).catch(function(result) {
                reject(result);
            });
        }
        reader.readAsDataURL(file);
    });
}

function updateNotifyTime(docId, endTime, alertTime) {
    apigClient.documentSendNotifyTimePatch({}, {
        docId: docId,
        endTime: endTime,
        alertTime: alertTime,
    }).catch(function(result) {
        erralert(result);
    });
}
