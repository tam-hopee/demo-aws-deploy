'use strict';
// This function needs long time. You have to set about 180seconds.
var storj = require('storj-lib');
var through = require('through');
var fs = require('fs');
var request = require('request');
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
    var tableName = (event.context.stage == "prod") ? process.env.CC_TABLE_BLOCKCHAIN : process.env.CC_TABLE_BLOCKCHAIN_DEV;
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : res,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });

    keyGet(tableName, event['body-json'].key, event['body-json'].storjfileid).then((data) => {
        if (!data.Items[0]) {
            err.message = "Blockchain data is None."
            done(err, null);
        } else {
            var data = data.Items[0];
            var bucket = data.storjbucketid;
            var id = data.storjfileid;

            var tmpDir = '/tmp/' + (new Date()).getTime() + '/';
            fs.mkdirSync(tmpDir);
            var filepath = tmpDir + data.s3file;
            var target = fs.createWriteStream(filepath);

            console.log("BUCKET:" + bucket);
            console.log("FILEID:" + id);
            console.log("TMPFILE:" + filepath);

            downloadkeyfile(data.s3bucket, data.s3keyring, tmpDir.slice(0, -1)).then((result) => {

                console.log(result);
                walk('/tmp/', function(path) {
                    console.log("file:" + path);
                }, function(err) {
                    console.log("Receive err:" + err);
                });

                var keypair = storj.KeyPair(privateKey);
                var client = storj.BridgeClient(api, {
                    keyPair: keypair
                });
                var keyring = storj.KeyRing(tmpDir, 'keypass');
                var secret = keyring.get(id);

                var decrypter = new storj.DecryptStream(secret);
                var received = 0;
                var exclude = [];

                target.on('finish', function() {
                    console.log('info', 'File downloaded and written to %s.', [filepath]);
                    done(null, filepath);
                }).on('error', function(err) {
                    console.log('error', err.message);
                    done(err, null);
                });

                client.createFileStream(bucket, id, {
                    exclude: exclude
                }, function(err, stream) {
                    if (err) {
                        return console.log('error', err.message);
                        done(err, null);
                    }
                    stream.on('error', function(err) {
                        console.log('warn', 'Failed to download shard, reason: %s', [err.message]);
                        fs.unlink(filepath, function(unlinkFailed) {
                            if (unlinkFailed) {
                                return console.log('error', 'Failed to unlink partial file.');
                            }
                            if (!err.pointer) {
                                return;
                            }
                        });
                        done(err, null);
                    }).pipe(through(function(chunk) {
                        received += chunk.length;
                        console.log('info', 'Received %s of %s bytes', [received, stream._length]);
                        this.queue(chunk);
                    })).pipe(decrypter).pipe(target);
                });
                // client.createFileStream
            }).catch((err) => {
                done(err, null);
            });
            // downloadkeyfile
        };
    });
};


var keyGet = (tableName, key, storjfileid) => {
    return new Promise((resolve, reject) => {
        var values = {
            ":val": key,
            ":storjfileid": storjfileid
        };
        var filter = "#s = :storjfileid"
        var param = {
            TableName: tableName,
            KeyConditionExpression: "#k = :val",
            FilterExpression: filter,
            ExpressionAttributeValues: values,
            ExpressionAttributeNames: {
                "#k": "key",
                "#s": "storjfileid",
            }
        };
        dynamo.query(param, function(err, data) {
            if (err) reject(err);
            else resolve(data);
        });
    });
};

var downloadkeyfile = (bucket, file, outdir) => {
    return new Promise((resolve, reject) => {
        s3url(bucket, file, 60).then((result) => {
            var read = request.get(result);
            var write = targz().createWriteStream(outdir);
            write.on('close', function() {
                setTimeout(function() {
                    resolve("Stream finish!!!");
                }, 3000);
            });
            read.pipe(write);
        }).catch((err) => {
            reject(err);
        });
    });
};

var s3url = (bucket, filename, time) => {
    return new Promise((resolve, reject) => {
        var param = {
            Bucket: bucket,
            Key: filename,
            Expires: time
        };
        s3.getSignedUrl('getObject', param, function(err, data) {
            if (err) reject(err);
            else resolve(data);
        });
    });
};

var walk = function(p, fileCallback, errCallback) {
    fs.readdir(p, function(err, files) {
        if (err) {
            errCallback(err);
            return;
        }
        files.forEach(function(f) {
            var fp = p + f;
            if (fs.statSync(fp).isDirectory()) {
                fp = fp + "/";
                walk(fp, fileCallback);
            } else {
                fileCallback(fp);
            }
        });
    });
};
