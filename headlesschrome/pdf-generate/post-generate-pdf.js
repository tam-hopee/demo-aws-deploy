'use strict';
// This function needs long time. You have to set about 180seconds.
const launchChrome = require('@serverless-chrome/lambda');
const htmlPdf = require('html-pdf-chrome');
const CDP = require('chrome-remote-interface');
const fs = require('fs');
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
});
const s3 = new AWS.S3();

exports.handler = (event, context, callback) => {
    const tableName = (event.context.stage == "prod") ? {
        "key": process.env.CC_TABLE_KEY,
        "receiver": process.env.CC_TABLE_RECEIVER,
        "user": process.env.CC_TABLE_USER,
        "errorlog": process.env.CC_TABLE_ERROR_LOG
    } : {
        "key": process.env.CC_TABLE_KEY_DEV,
        "receiver": process.env.CC_TABLE_RECEIVER_DEV,
        "user": process.env.CC_TABLE_USER_DEV,
        "errorlog": process.env.CC_TABLE_ERROR_LOG_DEV
    };
    const P12BUCKET = (event.context.stage == "prod") ? process.env.CC_P12BUCKET : process.env.CC_P12BUCKET_DEV;
    const P12FILE = (event.context.stage == "prod") ? process.env.CC_P12FILE : process.env.CC_P12FILE_DEV;
    const PASSWORD = (event.context.stage == "prod") ? process.env.CC_PASSWORD : process.env.CC_PASSWORD_DEV;
    const PDFSIGNURL = (event.context.stage == "prod") ? process.env.CC_PDFSIGNURL : process.env.CC_PDFSIGNURL_DEV;
    const PDFVIEWURL = (event.context.stage == "prod") ? process.env.CC_PDFVIEWURL : process.env.CC_PDFVIEWURL_DEV;
    const OWNERKEY = (event.context.stage == "prod") ? process.env.CC_OWNERKEY : process.env.CC_OWNERKEY_DEV;
    const DOCKEY = event['body-json'].key;
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : res,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
    const _err = (err) => {
        if (err) {
            console.log('ERROR', err.message);
            var params = {
                TableName: tableName.errorlog,
                Item: {
                    "key": DOCKEY,
                    "createdtime": timestamp(),
                    "function": "post-generate-pdf",
                    "message": err.message
                }
            };
            dynamo.put(params, function(err, res) {
                console.log("INFO: " + res);
            });
            done(err, null);
        } else {
            return;
        }
    };
    const _warn = (warn) => {
        if (warn) {
            console.log('WARN', warn.message);
            done(null, warn);
        } else {
            return;
        }
    };

    // Get Document Info.
    var _bucket = '';
    var _file = '';
    var _reason = '';
    var isinvalid = false;
    var p1 = keyGet(tableName.key, "key", DOCKEY).then((data) => {
        if (data.Items[0].status !== "concluded") {
            isinvalid = true;
            done(null, {
                result: "invalid",
                message: "This key is not concluded."
            });
        } else {
            // 複数者間契約対応
            var processed_receivers = data.Items[0].processed_receivers;
            if (!processed_receivers) {
                // processed_receivers がない場合は単一データを取得する。
                processed_receivers = [{
                    "receiver": data.Items[0].receiver,
                    "status": data.Items[0].status,
                    "timestamp": data.Items[0].timestamp
                }];
            }
            keyGet(tableName.user, "id", data.Items[0].id).then((user) => {
                // 送信者情報を取得
                var sender = user.Items[0].email;
                processed_receivers.forEach(function(val) {
                    // 契約締結者情報を取得し、締結情報整形
                    let timestamp = timestampConvertor(val.timestamp);
                    _reason += '[' + timestamp + ' (JST)] <' + val.receiver + '> signed the document sent by <' + sender + '>.  ';
                });
                console.log("REASON:" + _reason);
                receiverGet(tableName.receiver, processed_receivers[0].receiver, data.Items[0].key).then((receiver) => {
                    // 契約書情報を取得
                    _bucket = receiver.Items[0].bucket + "/" + DOCKEY;
                    _file = receiver.Items[0].filename;
                    console.log("BUCKET:" + _bucket);
                    console.log("FILE:" + _file);
                }).catch((err) => {
                    _err(err);
                });
            }).catch((err) => {
                _err(err);
            });
        }
    }).catch((err) => {
        _err(err);
    });

    var certfile = '';
    // Download P12 File. S3://cc{env}-certificate/cc-{env}-identity.p12
    var p2 = getS3(P12BUCKET, P12FILE).then((filepath) => {
        console.log("TMPFILE:" + filepath);
        certfile = filepath;
    }).catch((err) => {
        _err(err);
    });

    var mainprocess = (callback) => {
        // Generate target PDF File. -- start.
        var html = PDFVIEWURL + "?key=" + DOCKEY + "&authkey=" + OWNERKEY;
        var options = {
            port: 9222,
            completionTrigger: new htmlPdf.CompletionTrigger.Timer(10000),
        };
        htmlPdf.create(html, options).then((pdfdata) => {
            var fileDir = '/tmp/' + DOCKEY + (new Date()).getTime() + '/';
            var pdffilePath = fileDir + _file;
            try {
                fs.mkdirSync(fileDir);
                fs.writeFileSync(pdffilePath, pdfdata.toBuffer());
            } catch (err) {
                _err(err);
            }
            // Main process. -- start.
            CDP((client) => {
                Promise.all([
                    client.Page.enable()
                ]).then(() => {
                    var _url = PDFSIGNURL + "?key=" + DOCKEY;
                    return client.Page.navigate({
                        url: _url
                    });
                });

                client.Page.loadEventFired(() => {

                    getDocument(client.DOM).then((params) => {
                        const nodeCert = {
                            nodeId: params.root.nodeId,
                            selector: "#cert"
                        };
                        const nodePdf = {
                            nodeId: params.root.nodeId,
                            selector: "#pdf"
                        };
                        const nodePass = {
                            nodeId: params.root.nodeId,
                            selector: "#pass"
                        };
                        const nodeReason = {
                            nodeId: params.root.nodeId,
                            selector: "#reason"
                        };
                        const nodeBucket = {
                            nodeId: params.root.nodeId,
                            selector: "#bucket"
                        };

                        var setCert = [];
                        var setPdf = [];
                        var setPass = [];
                        var setReason = [];
                        var setBucket = [];
                        var _p1 = querySelector(client.DOM, nodeCert).then((params) => {
                            setCert = {
                                nodeId: params.nodeId,
                                files: [certfile]
                            };
                        }).catch((err) => {
                            _err(err);
                        });
                        var _p2 = querySelector(client.DOM, nodePdf).then((params) => {
                            setPdf = {
                                nodeId: params.nodeId,
                                files: [pdffilePath]
                            };
                        }).catch((err) => {
                            _err(err);
                        });
                        var _p3 = querySelector(client.DOM, nodePass).then((params) => {
                            setPass = {
                                nodeId: params.nodeId,
                                name: "value",
                                value: PASSWORD
                            };
                        }).catch((err) => {
                            _err(err);
                        });
                        var _p4 = querySelector(client.DOM, nodeReason).then((params) => {
                            setReason = {
                                nodeId: params.nodeId,
                                name: "value",
                                value: _reason
                            };
                        }).catch((err) => {
                            _err(err);
                        });
                        var _p5 = querySelector(client.DOM, nodeBucket).then((params) => {
                            setBucket = {
                                nodeId: params.nodeId,
                                name: "value",
                                value: _bucket
                            };
                        }).catch((err) => {
                            _err(err);
                        });

                        Promise.all([_p1, _p2, _p3, _p4, _p5]).then(function() {

                            client.DOM.setFileInputFiles(setCert, (err, params) => {
                                _err(err);
                                client.DOM.setAttributeValue(setPass, (err, params) => {
                                    _err(err);
                                    client.DOM.setAttributeValue(setReason, (err, params) => {
                                        _err(err);
                                        client.DOM.setAttributeValue(setBucket, (err, params) => {
                                            _err(err);
                                            client.DOM.setFileInputFiles(setPdf, (err, params) => {
                                                _err(err);
                                                setTimeout(() => {
                                                    client.Runtime.evaluate({
                                                        expression: 'document.body.outerHTML'
                                                    }).then((result) => {
                                                        //console.log(result.result.value);
                                                        client.close();
                                                        callback(null, 'Upload is Done!!!');
                                                    }).catch((err) => {
                                                        _err(err);
                                                    });
                                                }, 10000);
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    }).catch((err) => {
                        _err(err);
                    });

                });
            }).on('error', (err) => {
                _err(err);
            });
            // Main process. -- end.
        }).catch((err) => {
            _err(err);
        });
        // Generate target PDF File. -- end.
    };

    // Access PDFSign Web with Headless Chrome.
    Promise.all([p1, p2]).then(function() {
        // Invalid Check
        if (isinvalid) {
            let warn = {
                "message": "This key is Invalid."
            };
            _warn(warn);
        } else {
            // Launch Chrome -- start.
            launchChrome({
                flags: ['--window-size=1280x1696', '--disable-gpu', '--hide-scrollbars', '--no-sandbox', '--single-process']
            }).then((chrome) => {
                mainprocess(function(err, res) {
                    _err(err);
                    console.log("INFO: " + res);
                    chrome.kill();
                    done(null, res);
                });
            }).catch((err) => {
                _err(err);
            });
            // Launch Chrome -- end.
        }
    });
};


var receiverGet = (tableName, receiver, key) => {
    return new Promise((resolve, reject) => {
        var values = {
            ":val": receiver,
            ":key": key
        };
        var param = {
            TableName: tableName,
            KeyConditionExpression: "#k = :val AND #s = :key",
            ExpressionAttributeValues: values,
            ExpressionAttributeNames: {
                "#k": "receiver",
                "#s": "key"
            }
        };
        dynamo.query(param, function(err, data) {
            if (err) reject(err);
            else resolve(data);
        });
    });
};

var keyGet = (tableName, name, key) => {
    return new Promise((resolve, reject) => {
        var values = {
            ":val": key,
        };
        var param = {
            TableName: tableName,
            KeyConditionExpression: "#k = :val",
            ExpressionAttributeValues: values,
            ExpressionAttributeNames: {
                "#k": name
            }
        };
        dynamo.query(param, function(err, data) {
            if (err) reject(err);
            else resolve(data);
        });
    });
};

var getS3 = (bucket, file) => {
    return new Promise((resolve, reject) => {
        s3.getObject({
            Bucket: bucket,
            Key: file
        }, function(err, res) {
            var filePath = '/tmp/' + (new Date()).getTime() + "-" + file;
            try {
                fs.writeFileSync(filePath, res.Body);
                resolve(filePath);
            } catch (err) {
                reject(err);
            }
        });
    });
};

var timestamp = () => {
    process.env.TZ = 'Asia/Tokyo';
    var dt = new Date();
    var year = dt.getFullYear();
    var month = dt.getMonth() + 1;
    var day = dt.getDate();
    var hour = dt.getHours();
    var min = dt.getMinutes();
    var sec = dt.getSeconds();
    if (month < 10) month = '0' + month;
    if (day < 10) day = '0' + day;
    if (hour < 10) hour = '0' + hour;
    if (min < 10) min = '0' + min;
    if (sec < 10) sec = '0' + sec;
    return String(year) + String(month) + String(day) + String(hour) + String(min) + String(sec);
};

var timestampConvertor = (timestamp) => {
    var year = timestamp.substr(0, 4);
    var month = timestamp.substr(4, 2);
    var day = timestamp.substr(6, 2);
    var hour = timestamp.substr(8, 2);
    var minute = timestamp.substr(10, 2);
    var second = timestamp.substr(12, 2);
    return year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second;
};

// Headless Chrome Functions.
var getDocument = (dom) => {
    return new Promise((resolve, reject) => {
        dom.getDocument((err, params) => {
            if (err) reject(err);
            else resolve(params);
        });
    });
};

var querySelector = (dom, target) => {
    return new Promise((resolve, reject) => {
        dom.querySelector(target, (err, params) => {
            if (err) reject(err);
            else resolve(params);
        });
    });
};
