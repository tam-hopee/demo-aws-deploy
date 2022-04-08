'use strict';
var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient({
	region: 'ap-northeast-1'
});
exports.handler = (event, context, callback) => {
	var tableName = (event.context.stage == "prod") ? process.env.CC_TABLE : process.env.CC_TABLE_DEV;
	var usertableName = (event.context.stage == "prod") ? process.env.CC_USER_TABLE : process.env.CC_USER_TABLE_DEV;
	var keyword = event.params.querystring.keyword;
	
	userGet(usertableName, event.context['cognito-identity-id']).then((data) => { // Get the currentId to check if the user is switching.
		var currentId = event.context['cognito-identity-id']
		if (data.Items[0].currentId) {
			currentId = data.Items[0].currentId
		}
		console.log("currentId is:" + currentId)
		userGet(usertableName, currentId).then((data) => {
			
			var param = {
				TableName: tableName,
				KeyConditionExpression: "#k = :val",
				FilterExpression: "#s= :status",
				ExpressionAttributeNames: {"#k": "receiver", "#s": "status"},
				ExpressionAttributeValues: {":val": data.Items[0].email, ":status": 'concluded'},
				
			};
			var res=[];
			dynamo.query(param, function(err, data) {
				if(err){
					console.log(err);
				}
				else {
					data.Items.forEach(function(item, index) {
						console.log(JSON.stringify(item));
						if(item['receiver'].indexOf(keyword) !== -1 || item['filename'].indexOf(keyword) !== -1) {
							res.push(item);
							
						}
					});
					callback(null, {
						statusCode: err ? '400' : '200',
						body: err ? err.message : JSON.stringify(res),
						headers: {
							'Content-Type': 'application/json',
							'Access-Control-Allow-Origin': '*'
						}
					});
				}
			});
		});
	});
};

var userGet = (tableName, id) => {
	return new Promise((resolve, reject) => {
		var values = {
			":val": id,
		};
		var param = {
			TableName: tableName,
			KeyConditionExpression: "#k = :val",
			ExpressionAttributeValues: values,
			ExpressionAttributeNames: {
				"#k": "id"
			}
		};
		dynamo.query(param, function(err, data) {
			if (err) reject(err);
			else resolve(data);
		});
	});
};
