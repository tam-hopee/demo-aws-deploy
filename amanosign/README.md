# amanosign
契約締結時、pdfにタイムスタンプ署名をするlambda function

## architecture
- https://aoxaox.atlassian.net/wiki/spaces/RIN/pages/1051230217/amano+timestamp

## Development
### Requirements
- java8
- Gradle 6.3
- awscli 2.0.44

### build 
```
gradle build
```

### Build & Deploy
```
sh deploy_lambda.sh $ENV(dev/prd)

#example
sh deploy_lambda.sh dev
```
