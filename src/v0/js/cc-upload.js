// CloudContract Pages:
// - upload.html
var account, apigClient;
window.onload = async () => {
    // load common parts
    $("#header").load("./header.html");
    $("#footer").load("./footer.html");
    $("#sidebar").load("./sidebar.html", null, function () {
        $("#docs-upload").addClass("m_send_active");
    });
    // init account class
    account = new Account();
    var token = await account.getToken();
    var authInfo = await account.getAuthInfo();
    if (token === null) {
        window.location.href = cclogin_page;
    } else {
        $(".cc-uname").text(account.cognitoUser.username)
        apigClient = apigClientFactory.newClient({
            accessKey: authInfo.accessKeyId,
            secretKey: authInfo.secretAccessKey,
            sessionToken: authInfo.sessionToken,
            apiKey: authInfo.apikey,
            region: authInfo.region
        });
    }
    // init upload class
    upload = new Upload();
    upload.sender = account.cognitoUser.username;
    getSwitchUser();
    $("#cc-step3-sender").text(upload.sender);
    $("[id^=send-mail-max-count-]").text(displayEmailMaxCount);
}

// Box collapsed
function openbox(selector) {
    // step box is opened
    $(selector).removeClass("collapsed-box");
    $(selector).find(".box-body").attr("style", "display: block;");
    $(selector).find(".box-footer").attr("style", "display: block;");
    $(selector + " > div.box-header.with-border > i").removeClass("fa-plus");
    $(selector + " > div.box-header.with-border > i").addClass("fa-minus");
}

function closebox(selector) {
    // step box is closed
    $(selector).addClass("collapsed-box");
    $(selector).find(".box-body").attr("style", "display: none;");
    $(selector).find(".box-footer").attr("style", "display: none;");
    $(selector + " > div.box-header.with-border > i").removeClass("fa-minus");
    $(selector + " > div.box-header.with-border > i").addClass("fa-plus");
}

// File Upload -- step.1
var uploadButton = document.getElementById('docsPost_btn');
uploadButton.addEventListener('click', function (e) {
    $("#cc-fileInput").click()
})
document.getElementById("cc-fileInput").addEventListener("change", function (e) {
    try {
        var fileList = this.files;
        uploadFile(fileList);
    } catch (msg) {
        erralert(msg);
    }
})

// docsPost -- step.1
function uploadFile(fileData) {
    for (var i = 0; i < fileData.length; i++) {
        var file = fileData[i];
        if (!file.type.match(/pdf$/)) {
            account.showMessage("PDFファイルを選択してください。", "alert-danger", "#message_docsPost", 0)
            return;
        }
        if (file.size > 10 * 1000 * 1000) {
            account.showMessage("10MB以下のファイルを選択してください。", "alert-danger", "#message_docsPost", 0)
            return;
        }
        var reader = new FileReader();
        reader.onerror = function () {
            account.showMessage("エラーが発生しました。再度アップロードしてください。", "alert-danger", "#message_docsPost", 0)
        }
        reader.onload = function (ev) {
            var params = {};
            var body = {
                data: ev.target.result,
                filename: file.name
            };
            // post pdf file to S3 bucket
            $("#cc-loading-step1").attr("style", "display: block;");
            apigClient.documentPost(params, body)
                .then(function (result) {
                    $("#cc-loading-step1").attr("style", "display: none;");
                    $("h1").text("送付先を設定してください。");
                    account.showMessage("アップロードが完了しました。Step2. 送付先の設定へ進んでください。", "alert-info", "#message_docsPost", 0)
                    openbox("#step2");
                    closebox("#step-review");
                    //var url = JSON.parse(result.data.body).Location
                    var key = JSON.parse(result.data.body).key
                    var bucket = JSON.parse(result.data.body).Bucket
                    var etag = (JSON.parse(result.data.body).ETag).replace(/\"/g, "")
                    var params = {};
                    // get signed URL (you can set expire time.)
                    var expiretime = 60 * 15 // 15min
                    apigClient.documentUrlPost(params, {
                        bucket: bucket,
                        filename: key,
                        time: expiretime
                    }).then(function (result) {
                        var url = JSON.parse(result.data.body);
                        $("#external-events").attr("style", "display:block;")
                        PDFJS.getDocument(url).then(function (pdfDoc_) {
                            pdfDoc = pdfDoc_;
                            document.getElementById('page_count').textContent = pdfDoc.numPages;
                            // Initial/first page rendering
                            renderPage(pageNum);
                        });
                        $("#cc-pager").attr("style", "display:block;");
                        $("#docsPost_btn").remove();
                        $("#cc-step3-docsinfo").attr("href", url);
                        $("#cc-step3-docsinfo").text(file.name);
                        var len = key.length - file.name.length;
                        var s3dirc = key.substr(0, len - 1); // S3のディレクトリ名を取得し、最後のスラッシュを削除
                        upload.setDocsinfo(etag, bucket + "/" + s3dirc, file.name);
                        upload.documentPreparePost("notset");
                    }).catch(function (result) {
                        erralert(JSON.stringify(result));
                    });
                }).catch(function (result) {
                    account.showMessage(JSON.stringify(result), "alert-danger", "#message_docsPost", 0)
                });
        }
        reader.readAsDataURL(file);
    }
}

// Set Confirm mails -- step.2
function confirm() {
    $.each(upload.receivers, function (key, elem) {
        if (key >= displayEmailMaxCount) {
            return;
        }
        if (key > 0) {
            $("#cc-step3-receiverBox-0").clone().attr("id", "cc-step3-receiverBox-" + key).insertAfter("#cc-step3-receiverBox-" + (key - 1));
            $("#cc-step3-receiverBox-" + key).find("#cc-step3-receiver-0").attr("id", "cc-step3-receiver-" + key);
            $("#cc-step3-receiverBox-" + key).find(".cc-step3-receiverLabel").text("");
        }
        $("#cc-step3-receiver-" + key).text(elem);
    });
    $.each(upload.reviewers, function (key, elem) {
        if (key > 0) {
            $("#cc-step3-reviewerBox-0").clone().attr("id", "cc-step3-reviewerBox-" + key).insertAfter("#cc-step3-reviewerBox-" + (key - 1));
            $("#cc-step3-reviewerBox-" + key).find("#cc-step3-reviewer-0").attr("id", "cc-step3-reviewer-" + key);
            $("#cc-step3-reviewerBox-" + key).find(".cc-step3-reviewerLabel").text("");
        }
        $("#cc-step3-reviewer-" + key).text(elem);
    });
}

function cleaning() {
    $("#cc-step3-receiver-0").text("送付先が設定されていません");
    $("#cc-step3-reviewer-0").text("-");
    var mails = $("[id^=cc-step3-receiverBox-]");
    var reviewermails = $("[id^=cc-step3-reviewerBox-]");
    $.each(mails, function (key, elem) {
        if (key > 0) {
            $("#cc-step3-receiverBox-" + key).remove();
        }
    });
    $.each(reviewermails, function (key, elem) {
        if (key > 0) {
            $("#cc-step3-reviewerBox-" + key).remove();
        }
    });
}

function uploadReceivers() {
    if (checkParams()) upload.documentPreparePost("notsend");
}

// Send mail -- step.3
function confirmStep3(type) {
    var modal = (type) => {
        if (type === "none") $("#modal-default").attr("class", "modal fade").attr("style", "display: none;");
        else $("#modal-default").attr("class", "modal fade in").attr("style", "display: block; z-Index: 2070;");
    }
    if (checkParams()) {
        if (type === "cancel") modal("none");
        else if (type === "done") sendMail();
        else modal();
    }
}

function sendMail() {
    if (checkParams()) {
        $("#cc-cancelBtn").attr("disabled", true);
        $("#cc-sendmailBtn > i").attr("style", "margin-right:10px;");
        $("#cc-sendmailBtn > span").text("送信中");
        $("#cc-sendmailBtn").prop("disabled", true);
        $("#cc-loading-step3").attr("style", "display: block;");
        var count = checkSignatureCount($("#cc-container"));
        var requestMessage = $("#cc-request-message").val();
        upload.setRequestMessage(requestMessage);
        $(document.getElementById('cc-container')).find('.textLayer').remove(); // renderpdfの容量問題暫定対応（不要要素を削除）
        $("#cc-container").find('input[type="checkbox"]:checked').attr('checked', true).attr('disabled', true); // disable checked checkboxes
        $("#cc-container").find('button.electronic-stamp-button').each(function (){
            if ($(this).find('>img').length > 0) {
                $(this).attr('disabled', true);
            }
        }); // 押印した場合は無効にする
        var renderpdf = document.getElementById('cc-container').innerHTML;
        var requests = upload.receivers.map((val, index) => {
            return new Promise((resolve, reject) => {
                const done = (result) => {
                    resolve(result);
                };
                if (upload.type === "multiple") {
                    // 複数者間契約の場合（ mapの最後に、receiversをそのままポストする。）
                    if (index == upload.receivers.length - 1) {
                        apigClient.timestampGet(params = {}, {}).then(function (result) {
                            var timestamp = timestampConvertor(result.data.body);
                            upload.documentSendPost(upload.receivers, renderpdf, count, timestamp).then(done);
                        }).catch(function (result) {
                            erralert(result);
                        });
                    } else {
                        done("loop");
                    }
                } else {
                    //  二者間契約の場合（ 受領者毎に処理を行う。）
                    var _receiver = [val];
                    apigClient.timestampGet(params = {}, {}).then(function (result) {
                        var timestamp = timestampConvertor(result.data.body);
                        upload.documentSendPost(_receiver, renderpdf, count, timestamp).then(done);
                    }).catch(function (result) {
                        erralert(result);
                    });
                };
            });
        });
        Promise.all(requests).then(() => {
            return new Promise((resolve, reject) => {
                const done = (result) => {
                    resolve(result);
                    $("#cc-loading-step3").attr("style", "display: none;");
                    if (upload.reviewers.length == 0) {
                        // 社内稟議がない場合は先方確認中一覧画面へ
                        window.location.href = "./sent.html";
                    } else {
                        // 社内稟議がある場合は社内稟議中一覧画面へ
                        window.location.href = "./review.html";
                    }
                };
                if (upload.reviewers.length == 0) {
                    // 社内稟議がない場合
                    upload.sendmailPost().then(upload.documentPreparePost("sent")).then(done);
                } else {
                    // 社内稟議がある場合：送付先へのメールはまだ送信しない。
                    upload.sendmailReviewer().then(upload.documentPreparePost("review")).then(done);
                }
            });
        });
    }
}

function checkParams() {
    if (!upload.etag) {
        alert("契約書がアップロードされていません。");
        $("h1").text("PDF形式の契約書をアップロードしてください。");
        return false;
    }
    if (upload.receivers.length == 0) {
        alert("送付先が設定されていません。");
        $("h1").text("送付先を設定してください。");
        return false;
    }
    return true;
}

function checkSignatureCount(element) {
    var count = 0;
    var box = element.find(".ui-draggable");
    box.each(function () {
        var textarea = $(this).find("textarea");
        textarea.each(function () {
            if (!($(this).val().match(/\S/g))) {
                // 署名済み以外をカウント
                count++;
            } else {
                var text = $(this).val();
                $(this).replaceWith("<p style='padding: 6px 12px;'>" + text + "</p>");
            }
        })
    })
    return count;
}


/* ----- Upload Class --------------- */
class Upload {
    // upload = new Uplaod()
    constructor() {
        this.keys = []; // mail send key.
        this.etag; // documents S3 etag.
        this.bucket; // documents S3 bucket.
        this.filename; // documents name.
        this.sender; // mail address sender.
        this.receivers = []; // mail address receivers(Multiple).
        this.reviewers = []; // mail address reviewers(Multiple).
        this.description; // mail text.
        this.requestMessage; // request message.
        this.type; // document Type.
    }

    setDocsinfo(etag, bucket, filename) {
        this.etag = etag;
        this.bucket = bucket;
        this.filename = filename;
    }

    documentPreparePost(status) {
        return new Promise((resolve, reject) => {
            var params = {};
            apigClient.documentPreparePost(params, {
                etag: this.etag,
                bucket: this.bucket,
                filename: this.filename,
                sender: this.sender,
                receivers: this.receivers,
                reviewers: this.reviewers,
                status: status,
                type: this.type
            }).then(function (result) {
                resolve(result);
            }).catch(function (result) {
                reject(result);
                erralert(result);
            });
        });
    }

    documentSendPost(receiver, renderpdf, signatureCount, timestamp) {
        let key = $.md5(this.sender + this.etag + receiver.join(',') + timestamp);
        this.keys.push(key);
        // 社内稟議機能対応：確認者がいなければ送付先送信、確認者がいればレビューステータスとする。
        let status = (upload.reviewers.length == 0) ? "sent" : "review";
        return new Promise((resolve, reject) => {
            var params = {};
            apigClient.documentSendPost(params, {
                key: key,
                bucket: this.bucket,
                filename: this.filename,
                receiver: receiver,
                sender: this.sender,
                reviewers: this.reviewers,
                status: status,
                renderpdf: renderpdf,
                signatureCount: signatureCount,
                type: this.type,
                requestMessage: this.requestMessage
            }).then(function (result) {
                resolve(result);
            }).catch(function (result) {
                reject(result);
                erralert(result);
            });
        });
    }

    sendmailPost() {
        return new Promise((resolve, reject) => {
            var params = {};
            apigClient.sendmailAuthPost(params, {
                keys: this.keys
            }).then(function (result) {
                resolve(result);
            }).catch(function (result) {
                reject(result);
                erralert(result);
            });
        });
    }

    sendmailReviewer() {
        return new Promise((resolve, reject) => {
            var params = {};
            apigClient.sendmailReviewerPost(params, {
                keys: this.keys
            }).then(function (result) {
                resolve(result);
            }).catch(function (result) {
                reject(result);
                erralert(result);
            });
        });
    }

    setRequestMessage(requestMessage) {
        this.requestMessage = requestMessage;
    }
}

const displayEmailMaxCount = 30;
let receiversFromCsv = [];
let receiversFromCsvCount = 0;
var csvUploadButton = document.getElementById('uploadCSV_btn');
csvUploadButton.addEventListener('click', function (e) {
    $("#cc-upload-csv").click()
});
document.getElementById("cc-upload-csv").addEventListener("change", function (e) {
    try {
        let fileList = this.files;
        let fileData = fileList[0];
        if (!fileData.name.match(/csv$/)) {
            alert("CSVファイルを選択してください");
            return;
        }
        initSendEmails();
        let reader = new FileReader();
        reader.readAsText(fileData);
        reader.onload = function () {
            let emails = reader.result.split(/\r?\n/g);
            emails.forEach(function (email) {
                if (email === "") {
                    return;
                }
                if (receiversFromCsvCount < displayEmailMaxCount) {
                    if (receiversFromCsvCount === 0) {
                        $("#cc-sendmail-input-0").val(email);
                    } else {
                        let selector = $("#cc-sendmail");
                        $(selector).clone(true).find("#cc-sendmail-input-0").attr("id", "cc-sendmail-input-" + receiversFromCsvCount).val(email).appendTo(selector);
                    }
                } else {
                    receiversFromCsv.push(email);
                }
                receiversFromCsvCount++;
            });
            if (receiversFromCsv.length > 0) {
                $("#send-mail-count").parent().parent().css("display","block");
            }
            $("#send-mail-count").text(receiversFromCsvCount);
        }
    } catch (msg) {
        erralert(msg);
    }
});

function initSendEmails() {
    var mails = $("[id^=cc-sendmail-input-]");
    $.each(mails, function (key, elem) {
        if (key > 0) {
            $("#cc-sendmail-input-" + key).remove();
        }
    });
    receiversFromCsv.length = 0;
    receiversFromCsvCount = 0;
}

function handleCSVDownload() {
    var bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    var content = 'sample01@cloudcontract.jp\r\nsample02@cloudcontract.jp\r\nsample03@cloudcontract.jp\r\nsample04@cloudcontract.jp\r\nsample05@cloudcontract.jp';
    var blob = new Blob([bom, content], {
        "type": "text/csv"
    });

    if (window.navigator.msSaveBlob) {
        window.navigator.msSaveBlob(blob, "sample.csv");
        // msSaveOrOpenBlobの場合はファイルを保存せずに開ける
        window.navigator.msSaveOrOpenBlob(blob, "sample.csv");
    } else {
        document.getElementById("csv-download").href = window.URL.createObjectURL(blob);
    }
}

function showCSVEmails() {
    let text = "";
    upload.receivers.forEach(function (email) {
        text += email + '\n';
    });
    alert(text);
}

function showReviewerEmails() {
    let text = "";
    upload.reviewers.forEach(function (email) {
        text += email + '\n';
    });
    alert(text);
}

// Electronic stamp
$(function() {
    $("#cc-container").on('click', 'button.electronic-stamp-button', function (e) {
        e.preventDefault();
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

        var imgSrc = canvas.toDataURL('image/png', 1);
        var $img = $("<img/>");
        $img.attr('src', imgSrc);
        if ($button.find('img').length > 0) {
            $button.find('img').remove();
        }
        if (text != '') {
            $button.append($img);
            $img.css('max-width', '100%');
            window.switchBorderBox($button.parents('.ui-draggable'), 'remove');
        } else {
            window.switchBorderBox($button.parents('.ui-draggable'));
        }
        $button.css('border-color', text == '' ? '#c3cfd9' : 'red');
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