#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ThreeTierEksStack } from '../lib/three-tier-eks-stack';

const app = new cdk.App();
new ThreeTierEksStack(app, 'ThreeTierEksStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
}); 