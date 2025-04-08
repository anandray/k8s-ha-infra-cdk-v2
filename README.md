# Three-Tier Highly Available Architecture on AWS EKS

This project implements a highly available three-tier architecture on AWS EKS using AWS CDK. The architecture is designed for production workloads with high availability, scalability, and security in mind.

## Architecture Overview

The architecture consists of three main tiers:

### 1. Web Tier
- Dedicated EKS node group for web services
- Instance Type: T3.MEDIUM
- Auto-scaling: 3-6 nodes
- Node labels and taints for pod placement
- Public subnet access for web traffic

### 2. Application Tier
- Dedicated EKS node group for application services
- Instance Type: T3.LARGE
- Auto-scaling: 3-6 nodes
- Node labels and taints for pod placement
- Private subnet for internal communication

### 3. Database Tier
- Aurora PostgreSQL cluster
- Instance Type: R6G.LARGE
- Multi-AZ deployment with 3 instances
- Private isolated subnets
- Automated backups and point-in-time recovery

### Caching Layer
- ElastiCache Redis cluster
- Instance Type: T4G.MEDIUM
- 3 nodes for high availability
- Private isolated subnets
- In-memory caching for improved performance

### Infrastructure Components
- VPC with 3 Availability Zones
- Subnet Configuration:
  - Public subnets for web tier
  - Private subnets for application tier
  - Isolated subnets for database and cache
- 3 NAT Gateways for high availability
- EKS Cluster with:
  - Cluster Autoscaler
  - Metrics Server
  - AWS Load Balancer Controller

## Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js (v14 or later)
- AWS CDK CLI
- kubectl
- aws-iam-authenticator

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd <repository-name>
```

2. Install dependencies:
```bash
npm install
```

3. Bootstrap AWS CDK (if not already done):
```bash
cdk bootstrap
```

## Deployment

1. Deploy the stack:
```bash
cdk deploy
```

2. Update kubeconfig:
```bash
aws eks update-kubeconfig --name ThreeTierCluster --region <your-region>
```

## Outputs

After successful deployment, the following endpoints will be available:

- EKS Cluster Endpoint
- RDS Aurora Endpoint
- ElastiCache Redis Endpoint

## Security Considerations

- All database and cache instances are in isolated subnets
- NAT gateways for outbound internet access
- IAM roles with least privilege
- Security groups with minimal required access
- Node taints and labels for pod isolation

## Scaling

The architecture supports both horizontal and vertical scaling:

- Horizontal scaling through EKS node groups
- Vertical scaling through instance type selection
- Database scaling through Aurora's auto-scaling
- Cache scaling through ElastiCache's auto-scaling

## Monitoring

- CloudWatch metrics for all AWS resources
- EKS metrics through metrics-server
- Custom metrics through Prometheus (can be added)

## Maintenance

- Regular security updates through EKS managed node groups
- Automated database backups
- Point-in-time recovery for databases
- Rolling updates for application deployments

## Cleanup

To remove all resources:
```bash
cdk destroy
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
