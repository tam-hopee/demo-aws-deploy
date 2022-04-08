'use strict';
const CryptoJS = require('crypto-js');
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
});
AWS.config.update({
    region: 'us-west-2'
});
var ses = new AWS.SES();
exports.handler = (event, context, callback) => {
    var tableName = (event.context.stage == "prod") ? {
        "key": process.env.CC_TABLE_KEY,
        "send": process.env.CC_TABLE_SEND,
        "auth": process.env.CC_TABLE_AUTH
    } : {
        "key": process.env.CC_TABLE_KEY_DEV,
        "send": process.env.CC_TABLE_SEND_DEV,
        "auth": process.env.CC_TABLE_AUTH_DEV
    };
    var domain = (event.context.stage == "prod") ? process.env.CC_DOMAIN : process.env.CC_DOMAIN_DEV;
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
    // POSTパラメーター： key, reviewer, reviewStatus
    return new Promise((resolve, reject) => {
        keyGet(tableName.auth, "id", "appkey").then((appkey) => { // アプリ共通 復号キー取得
            var reviewer = CryptoJS.AES.decrypt(event['body-json'].reviewer, appkey.Items[0].key).toString(CryptoJS.enc.Utf8);
            keyGet(tableName.key, "key", event['body-json'].key).then((data) => {
                // 確認者情報チェック
                var isreviewer = false;
                data.Items[0].reviewers.forEach(function(val) {
                    if (reviewer === val) {
                        isreviewer = true;
                    }
                });
                if (!isreviewer) {
                    done(null, {
                        result: "invalid",
                        message: "This request is not valid."
                    });
                    resolve();
                }
                documentSendGet(tableName.send, data.Items[0].id, data.Items[0].key).then((send) => {
                    ses2reviewer(domain, send.Items[0], reviewer, event['body-json'].reviewStatus)
                        .then(ses2sender(domain, send.Items[0], reviewer, event['body-json'].reviewStatus)).then(done);
                }).catch((err) => {
                    reject(err.message);
                });
            }).catch((err) => {
                reject(err.message);
            });
        });
    });
};


var keyGet = (tableName, name, id) => {
    return new Promise((resolve, reject) => {
        var values = {
            ":val": id,
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

var documentSendGet = (tableName, id, key) => {
    return new Promise((resolve, reject) => {
        var values = {
            ":val": id,
            ":key": key
        };
        var param = {
            TableName: tableName,
            KeyConditionExpression: "#k = :val AND #s = :key",
            ExpressionAttributeValues: values,
            ExpressionAttributeNames: {
                "#k": "id",
                "#s": "key"
            }
        };
        dynamo.query(param, function(err, data) {
            if (err) reject(err);
            else resolve(data);
        });
    });
};

var ses2reviewer = (domain, data, tomail, reviewStatus) => {
    return new Promise((resolve, reject) => {
        var title = "";
        if (reviewStatus === "approval") {
            title = "の内容を承認しました。";
        } else if (reviewStatus === "reject") {
            title = "の内容を却下しました。";
        }
        var params = {
            Destination: {
                ToAddresses: [tomail]
            },
            Message: {
                Body: {
                    Text: {
                        Data: "書類" + title + "\n\n・送信元メールアドレス：" + data.sender +
                            "\n・書類名：" + data.filename +
                            "\n・確認用URL：" + domain + "preview.html?key=" + data.key +
                            "\n\n上記URLよりご確認ください。" +
                            "\n\n＿＿＿＿＿＿\n" +
                            "\n本メールは送信専用のため、ご返信に対応する事はできません。" +
                            "\n本メールに心あたりがない場合は削除をお願いいたします。" +
                            "\n誤送付のメールを開示したり、自己利用のために用いることを固く禁じます。" +
                            "\n＿＿＿＿＿＿＿\n" +
                            "\n＊クラウドコントラクトの推奨ブラウザはGoogle Chromeとなっております。\n\n",
                        Charset: 'utf-8'
                    },
                    /*Html: {
                      Data: '',
                      Charset : 'utf-8'
                    }*/
                },
                Subject: {
                    Data: '【社内確認】「' + data.filename + '」' + title,
                    Charset: 'utf-8'
                }
            },
            Source: "CloudContract <info@cloudcontract.jp>"
        };
        ses.sendEmail(params, function(err, data) {
            if (err) reject(err);
            else resolve(data);
        });
    });
};

var ses2sender = (domain, data, tomail, reviewStatus) => {
    return new Promise((resolve, reject) => {
        var title = "";
        if (reviewStatus === "approval") {
            title = "の内容が承認されました。";
        } else if (reviewStatus === "reject") {
            title = "の内容が却下されました。";
        }
        var params = {
            Destination: {
                ToAddresses: [data.sender]
            },
            Message: {
                Body: {
                    Text: {
                        Data: "書類" + title + "\n\n・確認者メールアドレス：" + tomail +
                            "\n・書類名：" + data.filename +
                            "\n・確認用URL：" + domain + "preview.html?key=" + data.key +
                            "\n\n上記URLよりご確認ください。" +
                            "\n\n＿＿＿＿＿＿\n" +
                            "\n本メールは送信専用のため、ご返信に対応する事はできません。" +
                            "\n本メールに心あたりがない場合は削除をお願いいたします。" +
                            "\n誤送付のメールを開示したり、自己利用のために用いることを固く禁じます。" +
                            "\n＿＿＿＿＿＿＿\n\n",
                        Charset: 'utf-8'
                    },
                    /*Html: {
                      Data: '',
                      Charset : 'utf-8'
                    }*/
                },
                Subject: {
                    Data: '【社内確認】「' + data.filename + '」' + title,
                    Charset: 'utf-8'
                }
            },
            Source: "CloudContract <info@cloudcontract.jp>"
        };
        ses.sendEmail(params, function(err, data) {
            if (err) reject(err);
            else resolve(data);
        });
    });
};
