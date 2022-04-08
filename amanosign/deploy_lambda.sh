#!/bin/sh

set -e

# Parameters
#  $1: dev/prd
ENV=$1

# build for lambda
gradle build

# package
sam package \
--template-file template_${ENV}.yml \
--output-template-file output_${ENV}.yml \
--s3-bucket ccamano \
--s3-prefix lambda_functions/${ENV} \
--profile cc

# wait for packaging
echo "Waiting for package.."
sleep 10

# deploy
sam deploy \
--template-file output_${ENV}.yml \
--stack-name cc-${ENV} \
--capabilities CAPABILITY_IAM \
--parameter-overrides Env=${ENV} \
--profile cc

echo "Finish deploy"
