'use strict';
var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
});
AWS.config.update({
    region: 'us-west-2'
});
var ses = new AWS.SES();
exports.handler = (event, context, callback) => {
    var tableName = (event.context.stage == "prod") ? process.env.CC_TABLE : process.env.CC_TABLE_DEV;
    var usertableName = (event.context.stage == "prod") ? process.env.CC_USER_TABLE : process.env.CC_USER_TABLE_DEV;
    var domain = (event.context.stage == "prod") ? process.env.CC_DOMAIN : process.env.CC_DOMAIN_DEV;
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
    
    var userExpressionAttributeValues = {
        ":val": event.context['cognito-identity-id']
    };
    var userExpressionAttributeValues = {
        TableName: usertableName,
        KeyConditionExpression: "#k = :val",
        ExpressionAttributeValues: userExpressionAttributeValues,
        ExpressionAttributeNames: {
            "#k": "id"
        }
    };
    // Get the currentId to check if the user is switching.
    dynamo.query(userExpressionAttributeValues, function (err, data) {
        var currentId = event.context['cognito-identity-id']
        if (data.Items[0].currentId) {
            currentId = data.Items[0].currentId
        }
        console.log("currentId is:" + currentId)
    
        var result = {};
        var requests = event['body-json'].keys.map((val) => {
            return new Promise((resolve, reject) => {
                documentSendGet(tableName, currentId, val).then((data) => {
                    result.sender = data.Items[0].sender;
                    result.filename = data.Items[0].filename;
                    ses2receiver(domain, data.Items[0]).then((data) => {
                        resolve(data);
                    });
                }).catch((err) => {
                    reject(err.message);
                });
            });
        });
        Promise.all(requests).then(() => {
            return new Promise((resolve, reject) => {
                ses2sender(domain, result).then((data) => {
                    resolve(data);
                    done(null, data);
                }).catch((err) => {
                    reject(err.message);
                    done(err, null);
                });
            });
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

var ses2receiver = (domain, data) => {
    return new Promise((resolve, reject) => {
        var params = {
            Destination: {
                ToAddresses: data.receiver
            },
            Message: {
                Body: {
                    Text: {
                        Data: "こちらは、電子契約サービスを提供するクラウドコントラクトです。\nあなたへ書類の確認依頼が届きました。\n\n・送信元メールアドレス：" + data.sender +
                            "\n・書類名：" + data.filename +
                            "\n・確認用URL：" + domain + "preview.html?key=" + data.key + "&rc=" + data.verifycode +
                            "\n・URL有効期限：" + timestampConvertor(data.expiretime) +
                            "\n※有効期限を過ぎてしまった場合は送信者に再送を依頼してください。" +
                            "\n\n" +
                            "\n▼書類の確認手順" + 
                            "\n1. 確認用URLを開き、ご自身のメールアドレスを入力" + 
                            "\n2. 表示された書類を確認（記入欄がある場合は必要事項を入力）" + 
                            "\n3. 画面下部にある 「同意する」 または 「却下する」 ボタンを押下" + 
                            "\n\n▼ご注意" + 
                            "\n・本メールは送信専用です。ご返信いただきましてもご対応いたしかねます。" +
                            "\n・クラウドコントラクトの推奨ブラウザはGoogle Chromeです。" +
                            "\n・本メールに心あたりがない場合は削除をお願いいたします" +
                            "\n・誤送付のメールを開示したり、自己利用のために用いることを固く禁じます。" +
                            "\n\n" +
                            "\n電子契約サービス 【クラウドコントラクト】\nhttps://cloudcontract.jp\n\n",
                        Charset: 'utf-8'
                    },
                    /*Html: {
                      Data: '',
                      Charset : 'utf-8'
                    }*/
                },
                Subject: {
                    Data: '【要ご確認】「' + data.filename + '」が届いております。',
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

var ses2sender = (domain, data) => {
    return new Promise((resolve, reject) => {
        var params = {
            Destination: {
                ToAddresses: [data.sender]
            },
            Message: {
                Body: {
                    Text: {
                        Data: "こちらは、電子契約サービスを提供するクラウドコントラクトです。\n書類の確認依頼を送付しました。\n\n・書類名：" + data.filename +
                            "\n・契約書一覧確認画面：" + domain + "sent.html" +
                            "\n※上記URLよりご確認ください。" +
                            "\n\n" + 
                            "\n▼ご注意" + 
                            "\n・本メールは送信専用です。ご返信いただきましてもご対応いたしかねます。" +
                            "\n・クラウドコントラクトの推奨ブラウザはGoogle Chromeです。" +
                            "\n・本メールに心あたりがない場合は削除をお願いいたします" +
                            "\n・誤送付のメールを開示したり、自己利用のために用いることを固く禁じます。" +
                            "\n\n" +
                            "\n電子契約サービス 【クラウドコントラクト】\nhttps://cloudcontract.jp\n\n",
                        Charset: 'utf-8'
                    },
                    /*Html: {
                      Data: '',
                      Charset : 'utf-8'
                    }*/
                },
                Subject: {
                    Data: '【送付完了】「' + data.filename + '」の確認依頼を送付しました。',
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

var timestampConvertor = (timestamp) => {
    var year = timestamp.substr(0, 4);
    var month = timestamp.substr(4, 2);
    var day = timestamp.substr(6, 2);
    var hour = timestamp.substr(8, 2);
    var minute = timestamp.substr(10, 2);
    var second = timestamp.substr(12, 2);
    return String(year) + "/" + String(month) + "/" + String(day) + " " + String(hour) + ":" + String(minute);
};
