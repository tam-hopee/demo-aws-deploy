// CloudContract Pages:
// - preview.html
var account, apigClient, isGuest, receiverCode, myEmail;
var DLS3BUCKET, DLS3FILE;
window.onload = async() => {
    $("#header").load("./header.html");
    $("#footer").load("./footer.html");
    $("#sidebar").load("./sidebar.html", null, function() {});
    account = new Account();
    var token = await account.getToken();
    var authInfo = await account.getAuthInfo();
    isGuest = (token === null) ? true : false;
    if (token === null) {
        guestUserPreview();
        $("#modal-default").attr("style", "display: block;");
        if (!getGetParams().key) window.location.href = "./index.html";
    } else {
        apigClient = apigClientFactory.newClient({
            accessKey: authInfo.accessKeyId,
            secretKey: authInfo.secretAccessKey,
            sessionToken: authInfo.sessionToken,
            apiKey: authInfo.apikey,
            region: authInfo.region
        });

        this.myEmail = account.cognitoUser.username;
        $(".cc-uname").text(this.myEmail);
        getSwitchUser();

        if (getGetParams().etag) {
            // クラウドコントラクト外 ユーザーアップロードファイル表示
            apigClient.documentOriginalGet(params = {
                status: "concluded",
                folderid: "ignore",
                etag: getGetParams().etag,
            }, {}).then(function(result) {
                var res = JSON.parse(result.data.body);
                setDocsOriginalInfo(res.Items[0]);
            }).catch(function(result) {
                erralert(result);
            });
        } else if (!getGetParams().key) {
            window.location.href = "./index.html";
        } else {
            getCurrentUserEmail().then(function(currentUserEmail) {
                if (currentUserEmail) {
                    this.myEmail = currentUserEmail
                }
                // クラウドコントラクト内 取引内容表示
                var sidemenu = '<li id="cc-related" class="header">この書類の関係者</li><li><a class="cc-docs-relations-area"><span id="cc-docs-relations"><p id="cc-sender-label"></p></span></a></li>';
                $(".sidebar-menu").prepend(sidemenu);
                myCrypto(this.myEmail).then(function(key) {
                    this.receiverCode = key;
                    apigClient.documentKeysAuthGet(params = {
                        key: getGetParams().key,
                        receiver: this.receiverCode
                    }, {}).then(function(result) {
                        var res = JSON.parse(result.data.body);
                        if (res.result === "expired") errorExpired(res.sender);
                        else if (res.result === "deactive") errorDeleted(res.sender);
                        else if (res.result === "invalid") errorInvalid();
                        else if (invalidcheck(res.Items[0], this.myEmail)) errorInvalid();
                        else setDocsInfo(res.Items[0]);
                    }).catch(function(result) {
                        erralert(result);
                    });
                });
            })
        }
    }

    // Electronic stamp
    $(function() {
        $("#cc-container").on('click', 'button.electronic-stamp-button', function (e) {
            e.preventDefault();
            // 送信者の書類の確認画面の場合は何もしない
            if ($("#cc-decision-box").length < 1) {
                return;
            }
            $("#cc-inputElectronicStampError").hide();
            $("#modal-electronic-stamp").attr("class", "modal fade in").attr("style", "display: block; z-Index: 2070;").attr('data-buttonid', $(this).attr('id'));
            $("#cc-inputElectronicStamp").val(decodeURI($(this).attr('data-text') ? $(this).attr('data-text') : ''));
        });
        function generateImage(buttonId, text) {
            $("#modal-electronic-stamp").attr("class", "modal fade").attr("style", "display: none;");
            var $button = $("#"+buttonId);
            $button.attr('data-text', encodeURI(text));
            var canvas = document.createElement('canvas');
            var size = 90 * 2;
            var fontSize = 11 * 2;
            var lineHeight = 12 * 2;
            canvas.width  = size;
            canvas.height = size;
            canvas.style.position = "absolute";
            canvas.style.border   = "2px solid red";
            canvas.style.borderRadius   = "70px";
            var ctx = canvas.getContext("2d");
            ctx.font = fontSize+"px Arial";
            ctx.fillStyle = "red";
            text = text.replaceAll(" ", "\n").replaceAll("　", "\n");
            var textItems = text.split('\n');
            var centerY = (size/2) + fontSize/2;
            var textsWithYPosition = textItems.filter(x => x != '').map( x => { return { text: x, y: 0} } );
            var bottom = textsWithYPosition.length;
            if (bottom > 0) {
                var middle = Math.floor(bottom / 2);
                if (bottom % 2 === 0) {
                    textsWithYPosition[middle].y = centerY + fontSize/2;
                } else {
                    textsWithYPosition[middle].y = centerY;
                }
            }
            for(var i = middle + 1; i < bottom; i++) {
                textsWithYPosition[i].y = textsWithYPosition[i-1].y + lineHeight;
            }
            for(var i = middle - 1; i > -1; i--) {
                textsWithYPosition[i].y = textsWithYPosition[i+1].y - lineHeight;
            }

            for (var i = 0 ;i < textsWithYPosition.length; i++) {
                var textWidth = ctx.measureText(textsWithYPosition[i].text).width;
                ctx.fillText(textsWithYPosition[i].text , (canvas.width/2) - (textWidth / 2), textsWithYPosition[i].y);
            }

            var imgSrc = canvas.toDataURL();
            var $img = $("<img/>");
            $img.attr('src', imgSrc);
            if ($button.find('img').length > 0) {
                $button.find('img').remove();
            }
            if (text != '') {
                $button.append($img);
                $img.css('max-width', '100%');
            }
            $button.css('border-color', text == '' ? '#c3cfd9' : 'red');
            window.checkDisableConcludedButton();
        }
        $("body").on('click', '#cc-printStampBtn', function () {
            var text = $("#cc-inputElectronicStamp").val();
            if (text.length > 150) {
                $("#cc-inputElectronicStampError").show();
            } else {
                $("#cc-inputElectronicStampError").hide();
                generateImage($("#modal-electronic-stamp").attr('data-buttonid'), text);
            }
        });
        $("body").on('click', '#cc-cancelStampBtn', function () {
            $("#modal-electronic-stamp").attr("class", "modal fade").attr("style", "display: none;");
        });
    });
}

guestUserPreview = () => {
    $("#header").load("./header.html", null, function() {
        $(".nav_user").remove();
        $(".user-menu").remove();
    });
    $("#sidebar").load("./sidebar.html", null, function() {
        $(".user-panel").remove();
        $(".sidebar-menu").remove();
        var sidemenu = '<li id="cc-related" class="header">この書類の関係者</li><li><a class="cc-docs-relations-area"><span id="cc-docs-relations"><p id="cc-sender-label"></p></span></a></li>';
        $(".sidebar").append("<ul class=\"sidebar-menu\"></ul>")
        $(".sidebar-menu").prepend(sidemenu);
    });
}

guestUserGet = () => {
    if ($("#cc-inputEmail").val()) {
        this.myEmail = $("#cc-inputEmail").val();
        var verfycode = (getGetParams().rc) ? getGetParams().rc : "";
        myCrypto(this.myEmail).then(function(key) {
            this.receiverCode = key;
            apigClientFactory.newClient().documentKeysGet({
                key: getGetParams().key,
                receiver: key,
                authkey: "",
                verifycode: verfycode
            }, {}).then(function(result) {
                var res = JSON.parse(result.data.body);
                if (res.result === "expired") errorExpired(res.sender);
                else if (res.result === "deactive") errorDeleted(res.sender);
                else if (res.result === "invalid") errorInvalid();
                else setDocsInfo(res.Items[0]);
                $("#modal-default").attr("class", "modal fade").attr("style", "display: none;");
            }).catch(function(result) {
                erralert(result);
            });
        }).catch(function(result) {
            erralert(result);
        });
    }
}

postDocumentReviewer = (status) => {
    // 社内稟議レビュー完了処理
    if (status !== "approval" && status !== "reject") erralert("");
    else {
        $(".overlay").attr("style", "display: block;");
        let comment = myEscape($("#cc-document-review-comment").val());
        apigClientFactory.newClient().documentReviewerPost({}, {
            "key": getGetParams().key,
            "status": status,
            "reviewer": this.receiverCode,
            "comment": comment
        }).then(function(result) {
            var res = JSON.parse(result.data.body);
            if (res.result === "invalid") erralert(res);
            else {
                var done = () => {
                    $(".overlay").attr("style", "display: none;");
                    if (isGuest) window.location.href = "./processed.html";
                    else window.location.href = "./index.html";
                };
                if (res.status === "sent") {
                    // 確認者全員が合意済み（結果が sent ステータス）であればメール送付
                    sendmailReviewing(status).then(sendmailReviewed().then(done));
                } else {
                    sendmailReviewing(status).then(done);
                }
            }
        }).catch(function(result) {
            erralert(result);
        });
    }
}

postDocumentProcessed = (status) => {
    checkSignature($("#cc-container"));
    $(document.getElementById('cc-container')).find('.textLayer').remove(); // renderpdfの容量問題暫定対応（不要要素を削除）
    $("#cc-container").find('input[type="checkbox"]:checked').attr('checked', true)
    $("#cc-container").find('input[type="checkbox"]').attr('disabled', true); // disable checkboxes
    $("#cc-container").find('button.electronic-stamp-button').each(function () {
        if ($(this).find('>img').length < 1) {
            $(this).attr('disabled', true).text('押印').css('background', '#DFE6ED').css('color','#a1afbc').css('font-size', '25px');
        }
    });
    $("#cc-container").find('button.electronic-stamp-button').prop('disabled', true);
    var renderpdf = document.getElementById('cc-container').innerHTML;
    if (status !== "concluded" && status !== "dismissal") erralert("");
    else {
        $(".overlay").attr("style", "display: block;");
        apigClientFactory.newClient().documentProcessedPost({}, {
            "key": getGetParams().key,
            "status": status,
            "renderpdf": renderpdf,
            "receiver": this.receiverCode
        }).then(function(result) {
            var res = JSON.parse(result.data.body);
            if (res.result === "invalid") erralert(res);
            else {
                var done = () => {
                    $(".overlay").attr("style", "display: none;");
                    if (isGuest) window.location.href = "./processed.html";
                    else window.location.href = "./index.html";
                };
                pdfGenerate();
                sendmailPost().then(done);
            }
        }).catch(function(result) {
            erralert(result);
        });
    };
}

sendmailReviewed = () => {
    return new Promise((resolve, reject) => {
        apigClientFactory.newClient().sendmailReviewedPost({}, {
            "key": getGetParams().key,
            "reviewer": this.receiverCode
        }).then(function(result) {
            resolve(result);
        }).catch(function(result) {
            reject(result);
            erralert(result);
        });
    });
}

sendmailReviewing = (reviewStatus) => {
    return new Promise((resolve, reject) => {
        apigClientFactory.newClient().sendmailReviewingPost({}, {
            "key": getGetParams().key,
            "reviewer": this.receiverCode,
            "reviewStatus": reviewStatus
        }).then(function(result) {
            resolve(result);
        }).catch(function(result) {
            reject(result);
            erralert(result);
        });
    });
}

sendmailPost = () => {
    return new Promise((resolve, reject) => {
        apigClientFactory.newClient().sendmailPost({}, {
            "key": getGetParams().key,
            "receiver": this.receiverCode
        }).then(function(result) {
            resolve(result);
        }).catch(function(result) {
            reject(result);
            erralert(result);
        });
    });
}

setDocsInfo = (data) => {
    $("#cc-docs-name").text(data.filename);
    var pdfview = 'pdfview.html?key=' + getGetParams().key;
    var ismultiple = false; // 複数者契約かどうか
    if (isGuest) {
        if (getGetParams().rc) {
            // verifycode付きの場合（締結・却下前）
            pdfview += '&rc=' + getGetParams().rc
        }
        pdfview += '&guest=' + this.receiverCode;
    }
    $("#cc-pdfview-link").attr("href", pdfview);
    $("#cc-pdfview-link").parent().attr("style", "display:;");
    $("#cc-sender-label").text("依頼者：" + data.sender);
    if (typeof data.receiver === typeof []) {
        // 配列の場合（＝複数者間契約の実装リリース後に発生するパターン）
        data.receiver.forEach(function(val) {
            $("#cc-docs-relations").append("<p>受領者：" + val + "</p>");
        });
        if (data.type === "multiple") ismultiple = true;
    } else {
        $("#cc-docs-relations").append("<p>受領者：" + data.receiver + "</p>");
    }
    if (data.status === "review" || data.status === "reject") {
        // 社内稟議対応：稟議中の場合のみ確認者を表示させる
        data.reviewer.forEach(function(val) {
            $("#cc-docs-relations").append("<p>確認者：" + val + "</p>");
        });
        // 社内稟議対応：稟議中ステータスの場合は、社内同意・却下ボタンを表示させ、onclick属性を付与する。
        $("#cc-review-box").css("display", "");
        $("#cc-document-review-approval").attr("onclick", "postDocumentReviewer('approval');");
        $("#cc-document-review-reject").attr("onclick", "postDocumentReviewer('reject');");
        // 社内稟議対応：稟議中ステータスの場合は、署名エリアを非アクティブにする。
        setInterval(function() {
            $(".ui-draggable > textarea").prop('disabled', true);
            $("#cc-container input[type='checkbox']").attr('disabled', true);
            $("#cc-container").find('button.electronic-stamp-button').each(function (){
                if ($(this).find('>img').length < 1) {
                    $(this).attr('disabled', true).text('押印').css('background', '#DFE6ED').css('color','#a1afbc').css('font-size', '25px');
                }
            });
        }, 1000);
    } else {
        $("#cc-review-box").remove();
    }

    // show 確認依頼メッセージ
    if ((data.status === "review" || data.status === "sent" ) && data.requestMessage) {
        $("#cc-request-message").text(data.requestMessage)
        $("#cc-request-message-box").show()
    } else {
        $("#cc-request-message-box").hide()
    }
    setProcessedInfo(data);
    var params = {};
    apigClientFactory.newClient().documentUrlPost(params, {
        bucket: data.bucket,
        filename: data.filename,
        time: 60 * 15 // 15min
    }).then(function(result) {
        var url = JSON.parse(result.data.body);
        PDFJS.getDocument(url).then(function(pdfDoc_) {
            pdfDoc = pdfDoc_;
            document.getElementById('page_count').textContent = pdfDoc.numPages;
            // Initial/first page rendering
            renderPage(pageNum);
        });
        $("#cc-pager").attr("style", "display:block;");
        $("#cc-container").attr("style", "display:block;");
        $("#cc-container-dummy").html(data.renderpdf);
        // 複数者間契約であれば署名欄制御はしない
        var signatureCount = data.signatureCount;
        if (ismultiple) signatureCount = "multiple";
        $("#cc-container-dummy").append("<input id='cc-signatureCount' type='hidden' value='" + signatureCount + "'></input>");
    }).catch(function(result) {
        erralert(JSON.stringify(result));
    });

    if (!isGuest) {
        // 契約終了日、アラート通知日を取得する
        apigClient.documentSendDetailGet(params = {
            key: getGetParams().key,
        }, {}).then(function (result) {
            let v = JSON.parse(result.data.body).Item;
            if (v) {
                let endTime = "endtime" in v ? v["endtime"] : "";
                let alertTime = "alerttime" in v ? v["alerttime"] : "";
                let notifyTimeTag = "<h5><i class='fa fa-fw fa-calendar-check-o'></i> 契約終了日： " + timestampConvertorYYMMDD(endTime) + "　<i class='fa fa-fw fa-bell-o'></i> アラート：" + timestampConvertorYYMMDD(alertTime) + " </h5>";
                $("#cc-notifytime").append(notifyTimeTag);
            }
        }).catch(function (result) {
            erralert(result);
        });
    }
}

_processedInfo = (data, lists) => {
    if (data.status === "review" || data.status === "reject") {
        // 社内稟議対応
        if (data.processed_reviewers) {
            data.processed_reviewers.forEach(function(val) {
                var label = (val.status === "approval") ? "を承認しました。" : "を却下しました。";
                var timelineText = '<li><i class="fa fa-user bg-aqua"></i><div class="timeline-item"><span class="time"><i class="fa fa-clock-o"></i> ' + timestampConvertor(val.timestamp) + '</span>';
                if (val.comment !== "" && val.comment) {
                    // コメントがある場合
                    timelineText += '<h3 class="timeline-header">' + val.reviewer + ' が契約書の内容' + label + '</h3><div class="timeline-body"><a class="btn btn-warning btn-xs" style="float:left; margin-right:13px;">Comment</a><p class="text-muted">' + val.comment + '</p></div></div></li>'
                } else {
                    timelineText += '<h3 class="timeline-header no-border">' + val.reviewer + ' が契約書の内容' + label + '</h3></div></li>'
                }
                lists.push(timelineText);
                if (val.reviewer === this.myEmail) {
                    // すでに処理済みであれば、社内承認・却下ボタンエリアを削除する。
                    $("#cc-review-box").remove();
                }
            });
        }
    } else {
        var label = (data.status === "concluded") ? "に同意しました。" : "を却下しました。";
        lists.push('<li><i class="fa fa-user bg-aqua"></i><div class="timeline-item"><span class="time"><i class="fa fa-clock-o"></i> ' + timestampConvertor(data.timestamp) + '</span><h3 class="timeline-header no-border">' + data.receiver + ' が契約書' + label + '</h3></div></li>');
    }
}

setProcessedInfo = (data) => {
    var lists = [];
    // 社内稟議機能対応：[送付済み or 合意締結 or 却下]かつ稟議ありの場合はレビュー完了日時をメール送信日時とする
    let senttime = ((data.status === "sent" || data.status === "concluded" || data.status === "dismissal") && data.reviewedtime) ? data.reviewedtime : data.createdtime;
    var _list = '<li><i class="fa fa-envelope bg-blue"></i><div class="timeline-item"><span class="time"><i class="fa fa-clock-o"></i> ' + timestampConvertor(senttime) + '</span><h4 class="timeline-header">' + data.sender;
    if (data.status === "review" || data.status === "reject") {
        // 社内稟議対応
        $("#cc-track-title").text("本契約書の社内稟議状況");
        lists = [_list + ' が契約書の確認依頼を送付しました。</h4></div></li>'];
    } else {
        lists = [_list + ' が契約書に同意しメールを送付しました。</h4></div></li>'];
    }
    var isconcluded = true;
    var count_concluded = 0;
    if (data.processed_receivers) {
        // 複数者間契約対応
        if (data.isme) $("#cc-decision-box").remove();
        data.processed_receivers.forEach(function(_data) {
            // 締結 or 却下済み受信者取得
            _processedInfo(_data, lists);
            if (_data.receiver === this.myEmail) {
                $("#cc-decision-box").remove();
            }
            if (_data.status === "dismissal") {
                // 却下がある場合
                isconcluded = false;
            }
            if (_data.status === "concluded") {
                // 締結している場合
                count_concluded += 1;
            }
        });
        if (typeof data.receiver === typeof []) {
            // 複数者間契約の場合
            if (data.receiver.length !== count_concluded) {
                // 受領者と締結状態合計数がイコールでない場合
                isconcluded = false;
            }
        } else {
            if (count_concluded !== 1) {
                // 二者間契約の場合は必ず締結状態合計数が１になる。
                isconcluded = false;
            }
        }
    } else if (data.status !== "sent") {
        // 旧バージョン
        $("#cc-decision-box").remove();
        _processedInfo(data, lists);
    }
    if (data.status === "concluded" && isconcluded) {
        getBlockchain(data).then((data) => {
            if (data.storjfileid) {
                var ele = '<li><i class="fa fa-chain bg-yellow"></i><div class="timeline-item"><span class="time"><i class="fa fa-clock-o"></i> ' + timestampConvertor(data.createdtime) + '</span><h3 class="timeline-header no-border">ブロックチェーン上に契約書を記録しました。</h3><div class="timeline-footer">BlockChainID: ' + data.storjfileid + '</div></div></li>';
                $("#cc-docs-status > .box-body > ul > li > i.fa-clock-o").parent().before(ele);
            };
            DLS3BUCKET = data.s3bucket;
            DLS3FILE = data.s3file;
            $("#pdfdlbutton").attr("disabled", false).show();
        }).catch((err) => {
            //console.log(err);
        });
        // PDFダウンロード
        var pdfdlbutton = '<button id="pdfdlbutton" type="button" class="btn btn-primary" onclick="downloadPdf();" disabled><i class="fa fa-fw fa-cloud-download"></i> PDFをダウンロードする</button>&nbsp;&nbsp;';
        $('#cc-docs-status > div.box-footer').append(pdfdlbutton);
        $("#pdfdlbutton").hide();
        // 合意締結証明書
        var certbutton = '<button type="button" class="btn btn-primary" onclick="gotocertificate();"><i class="fa fa-fw fa-file-pdf-o"></i> 合意締結証明書を発行する</button>';
        $('#cc-docs-status > div.box-footer').append(certbutton);
    }
    lists.push('<li><i class="fa fa-clock-o bg-gray"></i></li>');
    lists.forEach(function(v, i) {
        $("#cc-docs-status > .box-body > ul").append(v);
    })
    $("#cc-docs-status").attr("style", "display: block;");

    if ((data.status === "sent" && data.isme) || data.status === "review" || data.status === "reject") {
        // 送付者自信もしくは稟議中ステータスの場合は同意・却下ボタンは削除する。
        $("#cc-decision-box").remove();
    } else {
        $("#cc-document-concluded").attr("style", "display:;");
        $("#cc-document-dismissal").attr("style", "display:;");
    }

    // 社内稟議確認者チェック
    var isreviewer = false;
    if (data.reviewer) {
        data.reviewer.forEach(function(reviewer) {
            if (reviewer === this.myEmail) isreviewer = true;
        });
    }
    // 社内稟議確認者でなければ同意・却下ボタンは削除する。
    if (!isreviewer) $("#cc-review-box").remove();

    // 契約書受信者チェック
    var isreceiver = false;
    if (typeof data.receiver === typeof []) {
        data.receiver.forEach(function(receiver) {
            if (receiver === this.myEmail) isreceiver = true;
        });
    } else {
        if (data.receiver === this.myEmail) isreceiver = true;
    }
    // 契約書受信者でなければ同意・却下ボタンは削除する。
    if (!isreceiver) $("#cc-decision-box").remove();
}

errorExpired = (sender) => {
    $("#cc-docs-name").text("このURLは、有効期限が切れています。");
    $("#cc-decision-box").remove();
    $("#cc-preview-document").append('<i class="fa fa-fw fa-warning"></i><span>送信者（ ' + sender + ' ）に再配信を依頼してください。</span>');
    $("#cc-sender-label").text("有効期限切れ");
    $("#cc-pdfview-link").parent().remove();
    $(".overlay").attr("style", "display: none;");
}

errorInvalid = () => {
    $("#cc-docs-name").text("認証エラー");
    $("#cc-decision-box").remove();
    $("#cc-preview-document").append('<i class="fa fa-fw fa-warning"></i><span>URLが無効もしくは、認証情報が異なります。</span>');
    $("#cc-sender-label").text("認証エラー");
    $("#cc-pdfview-link").parent().remove();
    $(".overlay").attr("style", "display: none;");
}

errorDeleted = (sender) => {
    $("#cc-docs-name").text("このURLの契約書は、既に削除されています。");
    $("#cc-decision-box").remove();
    $("#cc-preview-document").append('<i class="fa fa-fw fa-warning"></i><span>送信者（ ' + sender + ' ）に確認をしてください。</span>');
    $("#cc-sender-label").text("削除済み");
    $("#cc-pdfview-link").parent().remove();
    $(".overlay").attr("style", "display: none;");
}

gotocertificate = () => {
    var para = 'certificate.html?key=' + getGetParams().key;
    if (isGuest) {
        para += '&guest=' + this.receiverCode;
    }
    window.open(para);
}

checkSignature = (element) => {
    var box = element.find(".ui-draggable");
    box.each(function() {
        var textarea = $(this).find("textarea");
        textarea.each(function() {
            if ($(this).val().match(/\S/g)) {
                var text = $(this).val();
                $(this).replaceWith("<p style='padding: 6px 12px;'>" + text + "</p>");
            }
        })
    })
}

pdfGenerate = () => {
    apigClientFactory.newClient().pdfGeneratePost({}, {
        "key": getGetParams().key
    }).then(function(result) {
        var res = JSON.parse(result.data.body);
        console.log(res);
    }).catch(function(result) {
        var res = JSON.parse(result.data.body);
        console.log(res);
    });
}

getBlockchain = (data) => {
    return new Promise((resolve, reject) => {
        if (isGuest) {
            apigClientFactory.newClient().blockchainGet({
                "key": data.key,
                "receiver": this.receiverCode
            }, {}).then(function(result) {
                if (result.data === null) reject(result);
                else {
                    var res = JSON.parse(result.data.body);
                    resolve(res.Items[0]);
                }
            });
        } else {
            apigClient.blockchainAuthGet(params = {
                key: data.key
            }, {}).then(function(result) {
                console.log("------debug-------")
                console.log(JSON.stringify(result))
                if (result.data === null) reject(result);
                else {
                    let res = JSON.parse(result.data.body);
                    let isinvalid = invalidcheck(data, this.myEmail);
                    if (!res.Items[0].isme && isinvalid) reject();
                    else resolve(res.Items[0]);
                }
            });
        }
    });
}

downloadPdf = () => {
    apigClientFactory.newClient().documentUrlPost({}, {
        bucket: DLS3BUCKET,
        filename: DLS3FILE,
        time: 30
    }).then(function(result) {
        var url = JSON.parse(result.data.body);
        var a = window.document.createElement('a');
        a.href = url;
        a.download = DLS3FILE;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }).catch(function(result) {
        erralert(JSON.stringify(result));
    });
}



// クラウドコントラクト外 アップロードファイル表示

setDocsOriginalInfo = (data) => {
    DLS3BUCKET = data.bucket;
    DLS3FILE = data.filename;
    $("#cc-decision-box").remove();
    $("#cc-docs-name").text(data.filename);
    var pdfview = 'pdfview.html?etag=' + getGetParams().etag;
    $("#cc-pdfview-link").attr("href", pdfview);
    $("#cc-pdfview-link").parent().attr("style", "display:;");
    $("#cc-pdfdownload-link").parent().attr("style", "display:;");
    var params = {};
    apigClientFactory.newClient().documentUrlPost(params, {
        bucket: data.bucket,
        filename: data.filename,
        time: 60 * 15 // 15min
    }).then(function(result) {
        var url = JSON.parse(result.data.body);
        PDFJS.getDocument(url).then(function(pdfDoc_) {
            pdfDoc = pdfDoc_;
            document.getElementById('page_count').textContent = pdfDoc.numPages;
            // Initial/first page rendering
            renderPage(pageNum);
        });
        $("#cc-pager").attr("style", "display:block;");
        $("#cc-container").attr("style", "display:block;");
    }).catch(function(result) {
        erralert(JSON.stringify(result));
    });
}
