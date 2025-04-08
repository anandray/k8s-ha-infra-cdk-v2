import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';

export class ThreeTierEksStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC with 3 AZs for high availability
    const vpc = new ec2.Vpc(this, 'ThreeTierVPC', {
      maxAzs: 3,
      natGateways: 3,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        }
      ],
    });

    // Create EKS cluster
    const cluster = new eks.Cluster(this, 'ThreeTierCluster', {
      version: eks.KubernetesVersion.V1_29,
      vpc,
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      defaultCapacity: 0,
      kubectlLayer: lambda.LayerVersion.fromLayerVersionArn(
        this,
        'KubectlLayer',
        `arn:aws:lambda:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:layer:awscli:1`
      ),
    });

    // Create RDS Aurora PostgreSQL cluster (Database Tier)
    const dbCluster = new rds.DatabaseCluster(this, 'Database', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_3,
      }),
      instanceProps: {
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.R6G, ec2.InstanceSize.LARGE),
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        vpc,
      },
      instances: 3,
      defaultDatabaseName: 'appdb',
    });

    // Create ElastiCache Redis cluster (Caching Tier)
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Subnet group for Redis',
      subnetIds: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_ISOLATED }).subnetIds,
    });

    const redisCluster = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
      cacheNodeType: 'cache.t4g.medium',
      engine: 'redis',
      numCacheNodes: 3,
      vpcSecurityGroupIds: [dbCluster.connections.securityGroups[0].securityGroupId],
      cacheSubnetGroupName: redisSubnetGroup.ref,
    });

    // Create node groups for different tiers
    // Web Tier Node Group
    cluster.addNodegroupCapacity('WebNodeGroup', {
      instanceTypes: [
        ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
      ],
      minSize: 3,
      maxSize: 6,
      desiredSize: 3,
      labels: { tier: 'web' },
      taints: [{ key: 'tier', value: 'web', effect: eks.TaintEffect.NO_SCHEDULE }],
    });

    // Application Tier Node Group
    cluster.addNodegroupCapacity('AppNodeGroup', {
      instanceTypes: [
        ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.LARGE),
      ],
      minSize: 3,
      maxSize: 6,
      desiredSize: 3,
      labels: { tier: 'app' },
      taints: [{ key: 'tier', value: 'app', effect: eks.TaintEffect.NO_SCHEDULE }],
    });

    // Add Cluster Autoscaler
    cluster.addHelmChart('ClusterAutoscaler', {
      chart: 'cluster-autoscaler',
      repository: 'https://kubernetes.github.io/autoscaler',
      namespace: 'kube-system',
      values: {
        'autoDiscovery.clusterName': cluster.clusterName,
        'awsRegion': cdk.Stack.of(this).region,
      },
    });

    // Add metrics server
    cluster.addHelmChart('MetricsServer', {
      chart: 'metrics-server',
      repository: 'https://kubernetes-sigs.github.io/metrics-server/',
      namespace: 'kube-system',
    });

    // Output important information
    new cdk.CfnOutput(this, 'ClusterEndpoint', {
      value: cluster.clusterEndpoint,
      description: 'EKS cluster endpoint',
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: dbCluster.clusterEndpoint.hostname,
      description: 'RDS Aurora endpoint',
    });

    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: redisCluster.attrRedisEndpointAddress,
      description: 'ElastiCache Redis endpoint',
    });
  }
} 