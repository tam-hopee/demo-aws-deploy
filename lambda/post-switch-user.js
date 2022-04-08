'use strict';
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient({
	region: 'ap-northeast-1',
	convertEmptyValues: true
});
exports.handler = (event, context, callback) => {
	console.log('Received event:', JSON.stringify(event, null, 2));
	var tableName = (event.context.stage == "prod") ? {
		"user": process.env.CC_TABLE
	} : {
		"user": process.env.CC_TABLE_DEV
	};
	var tableName = (event.context.stage == "prod") ? process.env.CC_TABLE : process.env.CC_TABLE_DEV;
	const done = (err, res) => callback(null, {
		statusCode: err ? '400' : '200',
		body: err ? err.message : JSON.stringify(res),
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*'
		}
	});
	
	let switchUserId = event['body-json'].switchUserId;
	
	var params = {
		TableName: tableName.user,
		Key:{
			"id": event.context['cognito-identity-id']
		},
		UpdateExpression:"set currentId = :currentId",
		ExpressionAttributeValues: {
			":currentId": switchUserId
		}
	};
	
	var updateUserTable = function() {
		return new Promise((resolve, reject) => {
			dynamo.update(params, function(err, data) {
				console.log("UPDATE:" + params.TableName);
				if (err) reject(err);
				else resolve(data);
			});
		});
	};
	updateUserTable()
	.then(done(null, {
		result: "success"
	}));
};
