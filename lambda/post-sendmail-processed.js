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
        "receiver": process.env.CC_TABLE_RECEIVER,
        "auth": process.env.CC_TABLE_AUTH
    } : {
        "key": process.env.CC_TABLE_KEY_DEV,
        "receiver": process.env.CC_TABLE_RECEIVER_DEV,
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
    return new Promise((resolve, reject) => {
        keyGet(tableName.auth, "id", "appkey").then((appkey) => { // アプリ共通 復号キー取得
            var email = CryptoJS.AES.decrypt(event['body-json'].receiver, appkey.Items[0].key).toString(CryptoJS.enc.Utf8);
            keyGet(tableName.key, "key", event['body-json'].key).then((data) => {
                // ステータスチェック（ concluded or dismissalの場合にのみメール送付 ）
                if (data.Items[0].status !== process.env.CONCLUDED && data.Items[0].status !== process.env.DISMISSAL) {
                    done(null, {
                        result: "invalid",
                        message: "This key is not concluded or dismissal."
                    });
                    resolve();
                } else {
                    // 締結 or 却下確定のタイミングで関係者各位にメールを送付する。
                    let receiver = (email) ? email : data.Items[0].receiver;
                    let tomail = (typeof data.Items[0].receiver === typeof []) ? data.Items[0].receiver : [data.Items[0].receiver];
                    documentReceiverGet(tableName.receiver, receiver, data.Items[0].key).then((receiver) => {
                        receiver.Items[0].status = data.Items[0].status; // 大元データのstatusに合わせる（複数者間契約対応）
                        ses2receiver(domain, receiver.Items[0], tomail).then(ses2sender(domain, receiver.Items[0], tomail)).then(done);
                    }).catch((err) => {
                        reject(err.message);
                    });
                }
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

var documentReceiverGet = (tableName, receiver, key) => {
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

var ses2receiver = (domain, data, tomail) => {
    return new Promise((resolve, reject) => {
        var htext = (data.status === process.env.CONCLUDED) ? "書類の合意締結が完了しました。" : "書類の内容を却下しました。";
        var title = (data.status === process.env.CONCLUDED) ? "の合意締結が完了しました。" : "の内容を却下しました。";
        var text_concluded = "\n※上記URLから書類のダウンロードが可能です。\n" +
        "\n\n▼書類のダウンロード手順" +
        "\n1. 確認用URLを開き、ご自身のメールアドレスを入力" +
        "\n2. 画面右にある「PDFをダウンロードする」ボタンを押下" +
        "\n\n▼ご注意" + 
        "\n・本メールは送信専用です。ご返信いただきましてもご対応いたしかねます。" +
        "\n・クラウドコントラクトの推奨ブラウザはGoogle Chromeです。" +
        "\n・本メールに心あたりがない場合は削除をお願いいたします" +
        "\n・誤送付のメールを開示したり、自己利用のために用いることを固く禁じます。";
        var text_reject = "\n" +
        "\n\n▼ご注意" + 
        "\n・契約書の再送は、お取引会社様へご連絡ください。" +
        "\n・本メールは送信専用です。ご返信いただきましてもご対応いたしかねます。" +
        "\n・本メールに心あたりがない場合は削除をお願いいたします。" +
        "\n・誤送付のメールを開示したり、自己利用のために用いることを固く禁じます。";
        var context =  (data.status === process.env.CONCLUDED) ? text_concluded : text_reject;
        var params = {
            Destination: {
                ToAddresses: tomail
            },
            Message: {
                Body: {
                    Text: {
                        Data: "こちらは、電子契約サービスを提供するクラウドコントラクトです。\n" + htext + "\n\n・送信元メールアドレス：" + data.sender +
                            "\n・書類名：" + data.filename +
                            "\n・確認用URL：" + domain + "preview.html?key=" + data.key +
                            context + 
                            "\n\n\n電子契約サービス 【クラウドコントラクト】\nhttps://cloudcontract.jp\n\n",
                        Charset: 'utf-8'
                    },
                    /*Html: {
                      Data: '',
                      Charset : 'utf-8'
                    }*/
                },
                Subject: {
                    Data: '【要ご確認】「' + data.filename + '」' + title,
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

var ses2sender = (domain, data, tomail) => {
    return new Promise((resolve, reject) => {
        var htext = (data.status === process.env.CONCLUDED) ? "書類の合意締結が完了しました。" : "書類の内容が却下されました。";
        var title = (data.status === process.env.CONCLUDED) ? "の合意締結が完了しました。" : "の内容が却下されました。";
        var text_concluded = "\n※上記URLから書類のダウンロードが可能です。\n" +
        "\n\n▼書類のダウンロード手順" +
        "\n1. 確認用URLを開く" +
        "\n2. 画面右にある「PDFをダウンロードする」ボタンを押下" +
        "\n\n▼ご注意" + 
        "\n・本メールは送信専用です。ご返信いただきましてもご対応いたしかねます。" +
        "\n・クラウドコントラクトの推奨ブラウザはGoogle Chromeです。" +
        "\n・本メールに心あたりがない場合は削除をお願いいたします" +
        "\n・誤送付のメールを開示したり、自己利用のために用いることを固く禁じます。";
        var text_reject = "\n" +
        "\n\n▼ご注意" + 
        "\n・契約書の再送は、お取引会社様へご連絡ください。" +
        "\n・本メールは送信専用です。ご返信いただきましてもご対応いたしかねます。" +
        "\n・本メールに心あたりがない場合は削除をお願いいたします。" +
        "\n・誤送付のメールを開示したり、自己利用のために用いることを固く禁じます。";
        var context =  (data.status === process.env.CONCLUDED) ? text_concluded : text_reject;
        var params = {
            Destination: {
                ToAddresses: [data.sender]
            },
            Message: {
                Body: {
                    Text: {
                        Data: "こちらは、電子契約サービスを提供するクラウドコントラクトです。\n" + htext + "\n\n・確認元メールアドレス：" + arrayToString(tomail) +
                            "\n・書類名：" + data.filename +
                            "\n・確認用URL：" + domain + "preview.html?key=" + data.key +
                            context + 
                            "\n\n\n電子契約サービス 【クラウドコントラクト】\nhttps://cloudcontract.jp\n\n",
                        Charset: 'utf-8'
                    },
                    /*Html: {
                      Data: '',
                      Charset : 'utf-8'
                    }*/
                },
                Subject: {
                    Data: '【要ご確認】「' + data.filename + '」' + title,
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

var arrayToString = (array) => {
    var res = '';
    var sep = ' , ';
    array.forEach(function(val) {
        res += val + sep;
    });
    return res.slice(0, -(sep.length));
};
