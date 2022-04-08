const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient({
	region: 'ap-northeast-1'
});
var ses = new AWS.SES({region: 'us-west-2'});

exports.handler = (event, context, callback) => {
	var env;
	if (typeof(event) == "string") {
		event = JSON.parse(event);
		env = event.env;
	} else {
		env = event.env;
	}
	
	console.log(env);
	
	var tableName = (env == "prod") ? process.env.CC_TABLE_SEND : process.env.CC_TABLE_SEND_DEV;
	var domain = (env == "prod") ? process.env.CC_DOMAIN : process.env.CC_DOMAIN_DEV;
	var docClient = new AWS.DynamoDB.DocumentClient({
		region: 'ap-northeast-1'
	});
	
	const scanAll = async () => {
		let  params = {
			TableName: tableName,
			FilterExpression: "#alerttime = :alerttime",
			ExpressionAttributeNames: {
				"#alerttime": "alerttime",
			},
			ExpressionAttributeValues: {
				":alerttime": today()
			}
		};
		let items = [];
		
		const scan = async () => {
			const result = await docClient.scan(params).promise();
			items.push(...result.Items);
			
			if (result.LastEvaluatedKey) {
				params.ExclusiveStartKey = result.LastEvaluatedKey;
				await scan()
			}
		};
		
		try {
			await scan();
			return items
		} catch (err) {
			console.error(`[Error]: ${JSON.stringify(err)}`);
			return err
		}
	};
	
	(async () => {
		const items = await scanAll();
		items.forEach(function(item) {
			console.log(JSON.stringify(item));
			var receiver = Array.isArray(item.receiver) ? item.receiver.join(","):item.receiver;
			var title = "【お知らせ】「" + item.filename + "」の期限が迫っております。";
			var body =
				"\nいつもクラウドコントラクトをご利用頂きありがとうございます。" +
				"\nご契約書の期限が近づいておりますので、ご確認下さい。" +
				"\n\n・確認元メールアドレス：" + receiver +
				"\n・書類名：" + item.filename +
				"\n・確認用URL：" + domain + "preview.html?key=" + item.key +
				"\n\n上記URLよりご確認ください。\n" +
				"\n\n＿＿＿＿＿＿\n" +
				"\n本メールは送信専用のため、ご返信に対応する事はできません。" +
				"\n本メールに心あたりがない場合は削除をお願いいたします。" +
				"\n誤送付のメールを開示したり、自己利用のために用いることを固く禁じます。" +
				"\n＿＿＿＿＿＿\n";
			var params = {
				Destination: {
					ToAddresses: [item.sender]
				},
				Message: {
					Subject: {
						Data: title,
						Charset: 'utf-8'
					},
					Body: {
						Text: {
							Data: body,
							Charset: 'utf-8'
						},
					}
				},
				Source: "CloudContract <info@cloudcontract.jp>"
			};
			ses.sendEmail(params, function (err, data) {
				callback(null, {err: err, data: data});
				if (err) {
					console.log(err);
					context.fail(err);
				} else {
					context.succeed(event);
				}
			});
		});
	})();
};

var today = () => {
	var dt = new Date();
	var year = dt.getFullYear();
	var month = dt.getMonth() + 1;
	var day = dt.getDate();
	if (month < 10) month = '0' + month;
	if (day < 10) day = '0' + day;
	return String(year) + String(month) + String(day);
};
