'use strict';
// This function needs long time. You have to set about 180seconds.
var storj = require('storj-lib');
var fs = require('fs');
var targz = require('node-tar.gz');
var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'ap-northeast-1'
});
var s3 = new AWS.S3();
var _s3 = require('s3');
var options = {
    s3Client: s3,
};
var s3client = _s3.createClient(options);
var api = 'https://api.storj.io';

exports.handler = (event, context, callback) => {
    var privateKey = (event.context.stage == "prod") ? process.env.PRIVATE_KEY : process.env.PRIVATE_KEY_DEV;
    var tableName = (event.context.stage == "prod") ? {
        "user": process.env.CC_TABLE_USER,
        "key": process.env.CC_TABLE_KEY,
        "blockchain": process.env.CC_TABLE_BLOCKCHAIN,
        "blockchain_prepare": process.env.CC_TABLE_BLOCKCHAIN_PREPARE
    } : {
        "user": process.env.CC_TABLE_USER_DEV,
        "key": process.env.CC_TABLE_KEY_DEV,
        "blockchain": process.env.CC_TABLE_BLOCKCHAIN_DEV,
        "blockchain_prepare": process.env.CC_TABLE_BLOCKCHAIN_PREPARE_DEV
    };
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : res,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });

    var _bucket, _file, _storjbucketid;
    keyGet(tableName.key, event['body-json'].key.S, "key", false).then((data) => {
        if (data.Items[0].status !== "concluded") {
            done(null, {
                result: "invalid",
                message: "This key is not concluded."
            });
        } else {
            var key = data.Items[0].key;
            var id = data.Items[0].id;
            var p1 = keyGet(tableName.blockchain_prepare, key, "key", true).then((data) => {
                _bucket = data.Items[0].s3bucket;
                _file = data.Items[0].s3file;
                console.log("BUCKET:" + _bucket);
                console.log("FILE:" + _file);
            }).catch((err) => {
                done(err, null);
                console.log('ERROR', err.message);
            });
            var p2 = keyGet(tableName.user, id, "id", false).then((data) => {
                _storjbucketid = data.Items[0].storjbucketid;
                console.log("STORJID:" + _storjbucketid);
            }).catch((err) => {
                done(err, null);
                console.log('ERROR', err.message);
            });
            Promise.all([p1, p2]).then(function() {
                getS3(_bucket, _file).then((filepath) => {
                    console.log("TMPFILE:" + filepath);
                    // Storj File Upload -- start
                    // Initial settings
                    var keypair = storj.KeyPair(privateKey);
                    var client = storj.BridgeClient(api, {
                        keyPair: keypair,
                        concurrency: 6
                    });
                    var tmppath = filepath + '.crypt';
                    var keyringDir = '/tmp/' + (new Date()).getTime() + '/';
                    fs.mkdirSync(keyringDir);
                    var keyring = storj.KeyRing(keyringDir, 'keypass');

                    var secret = new storj.DataCipherKeyIv();
                    var encrypter = new storj.EncryptStream(secret);
                    // File upload main.
                    fs.createReadStream(filepath)
                        .pipe(encrypter)
                        .pipe(fs.createWriteStream(tmppath)).on('finish', function() {
                            client.createToken(_storjbucketid, 'PUSH', function(err, token) {
                                if (err) {
                                    done(err, null);
                                    console.log('ERROR', err.message);
                                }
                                client.storeFileInBucket(_storjbucketid, token.token, tmppath, function(err, file) {
                                    if (err) {
                                        done(err, null);
                                        console.log('ERROR', err.message);
                                    }
                                    // Set key.ring and upload.
                                    keyring.set(file.id, secret);
                                    var compressedFile = keyringDir + 'key.ring.tar.gz';
                                    targz().compress(keyringDir + 'key.ring', compressedFile)
                                        .then(function() {
                                            console.log('Compress done!!!');
                                            var params = {
                                                localFile: compressedFile,
                                                s3Params: {
                                                    Bucket: _bucket,
                                                    Key: file.id + '.tar.gz',
                                                    ContentType: 'application/tar+gzip'
                                                },
                                            };
                                            var uploader = s3client.uploadFile(params);
                                            uploader.on('error', function(err) {
                                                done(err, null);
                                                console.error("unable to upload:", err.stack);
                                            });
                                            uploader.on('progress', function() {
                                                console.log("progress", uploader.progressMd5Amount,
                                                    uploader.progressAmount, uploader.progressTotal);
                                            });
                                            uploader.on('end', function() {
                                                console.log("Upload Key.ring is Successed!!!");
                                                var item = {
                                                    "key": key,
                                                    "createdtime": timestamp(),
                                                    "storjbucketid": _storjbucketid,
                                                    "storjfileid": file.id,
                                                    "s3bucket": _bucket,
                                                    "s3file": _file,
                                                    "s3keyring": file.id + '.tar.gz'
                                                }
                                                putDB(tableName.blockchain, item).then((data) => {
                                                    done(null, data);
                                                }).catch((err) => {
                                                    done(err, null);
                                                    console.log('ERROR', err.message);
                                                });
                                            });
                                        })
                                        .catch(function(err) {
                                            done(err, null);
                                            console.log('Something is wrong ', err.stack);
                                        });
                                    console.log('Upload file is Successed!!!')
                                });
                            });
                        });
                }).catch((err) => {
                    done(err, null);
                    console.log('ERROR', err.message);
                });
                // Storj File Upload -- end
            });
        };
    }).catch((err) => {
        done(err, null);
        console.log('ERROR', err.message);
    });
};


var keyGet = (tableName, key, name, sort) => {
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
        if (sort) {
            param.ScanIndexForward = false
        }
        console.log(param);
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

var putDB = (tableName, Item) => {
    return new Promise((resolve, reject) => {
        var params = {
            TableName: tableName,
            Item: Item
        };
        dynamo.put(params, function(err, data) {
            if (err) reject(err);
            else resolve(data);
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
