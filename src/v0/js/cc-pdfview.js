// CloudContract Pages:
// - index.html
var account, apigClient, isGuest, receiverCode, myEmail;
window.onload = async() => {
    account = new Account();
    var token = await account.getToken();
    var authInfo = await account.getAuthInfo();
    isGuest = (token === null) ? true : false;
    if (token === null) {
        var receiver = (getGetParams().guest) ? getGetParams().guest : "";
        var authkey = (getGetParams().authkey) ? getGetParams().authkey : "";
        var verifycode = (getGetParams().rc) ? getGetParams().rc : "";
        apigClientFactory.newClient().documentKeysGet({
            key: getGetParams().key,
            receiver: receiver,
            authkey: authkey,
            verifycode: verifycode
        }, {}).then(function(result) {
            var res = JSON.parse(result.data.body);
            setDocsInfo(res.Items[0]);
        }).catch(function(result) {
            window.location.href = "./index.html";
        });
    } else {
        this.myEmail = account.cognitoUser.username
        apigClient = apigClientFactory.newClient({
            accessKey: authInfo.accessKeyId,
            secretKey: authInfo.secretAccessKey,
            sessionToken: authInfo.sessionToken,
            apiKey: authInfo.apikey,
            region: authInfo.region
        });
        getCurrentUserEmail().then(function(currentUserEmail) {
            if (currentUserEmail) {
                this.myEmail = currentUserEmail
            }
            var processMyCrypto = myCrypto(this.myEmail).then(function(key) {
                this.receiverCode = key;
            });
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
                Promise.all([processMyCrypto]).then(function() {
                    // クラウドコントラクト内 取引ファイル表示
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
                });
            }
        })
    }
}

setDocsInfo = (data) => {
    var title = data.filename;
    $(".zopim").remove();
    $("title").text(title);
    renderPDF(data.renderpdf).then(() => {
        apigClientFactory.newClient().documentUrlPost({}, {
            bucket: data.bucket,
            filename: data.filename,
            time: 60
        }).then(function(result) {
            var url = JSON.parse(result.data.body);
            setPDF(url);
        }).catch(function(result) {
            erralert(result);
        });
    });
}

setDocsOriginalInfo = (data) => {
    var title = data.filename;
    $(".zopim").remove();
    $("title").text(title);
    apigClientFactory.newClient().documentUrlPost({}, {
        bucket: data.bucket,
        filename: data.filename,
        time: 60
    }).then(function(result) {
        var url = JSON.parse(result.data.body);
        setPDF(url);
    }).catch(function(result) {
        erralert(result);
    });
}

renderPDF = (renderpdf) => {
    return new Promise((resolve, reject) => {
        $("#cc-container-dummy").append(renderpdf);
        resolve();
    });
}

setPDF = (url) => {
    // Asynchronous download of PDF
    var loadingTask = PDFJS.getDocument(url);
    loadingTask.promise.then(function(pdf) {
        _getpdfpage(pdf, 1, pdf.numPages);
    }, function(reason) {
        // PDF loading error
        console.error(reason);
    });
}

_getpdfpage = (pdf, pageNumber, maxNumber) => {
    return new Promise((resolve, reject) => {
        pdf.getPage(pageNumber).then(function(page) {
            var scale = CC_PDFSCALE;
            var viewport = page.getViewport(scale);
            // Prepare canvas using PDF page dimensions
            var divid = 'cc-page-' + pageNumber;
            var caid = 'the-canvas-' + pageNumber;
            var element = '<section class="sheet"><div id="' + divid + '" style="position: relative"></div><canvas id="' + caid + '"></canvas>';
            $("#cc-container").append(element);
            var canvas = document.getElementById(caid);
            var context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            // Render PDF page into canvas context
            var renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            var renderTask = page.render(renderContext);

            // 署名エリアのレンダリング
            var box = $("#cc-container-dummy").find(".ui-draggable");
            box.each(function() {
                if ($(this).parent()[0].id == divid) {
                    // ページ毎に処理する。
                    $(this).css("cursor", "none").css("box-shadow", "0 0px 0px #ffffff").css("display", "block");
                    $("#cc-container").find("#" + divid).append(this);
                }
            })

            // 署名済みテキストの処理（改行判定）
            var p = $("#cc-container").find("#" + divid + "> div > p");
            p.each(function() {
                $(this).html($(this).context.innerHTML.replace(/\r?\n/g, "<br/>"));
            })

            renderTask.then(function() {
                var num = pageNumber + 1;
                if (pageNumber < maxNumber) _getpdfpage(pdf, num, maxNumber);
                else {
                    // PDF Size Check : [JIRA] CCAPPS-36
                    let w = parseInt($("#the-canvas-1").attr("width"));
                    let h = parseInt($("#the-canvas-1").attr("height"));
                    if (w > h) {
                        if (h > 800) {
                            $("head").append("<style>@page { size: A3 landscape }</style>")
                            $("body").addClass("A3 landscape");
                        } else if (h <= 800 && h > 700) {
                            $("head").append("<style>@page { size: A4 landscape }</style>")
                            $("body").addClass("A4 landscape");
                        } else {
                            $("head").append("<style>@page { size: A5 landscape }</style>")
                            $("body").addClass("A5 landscape");
                        }
                    } else {
                        if (w > 800) {
                            $("head").append("<style>@page { size: A3 }</style>")
                            $("body").addClass("A3");
                        } else if (w <= 800 && w > 700) {
                            $("head").append("<style>@page { size: A4 }</style>")
                            $("body").addClass("A4");
                        } else {
                            $("head").append("<style>@page { size: A5 }</style>")
                            $("body").addClass("A5");
                        }
                    }

                    // PDF render is finished.
                    $("#main").append("<div id='cc-render-done'></div>");
                    $(".overlay").remove();

                    resolve();
                };
            });
        }).catch(function(result) {
            reject(result);
        });
    });
}
