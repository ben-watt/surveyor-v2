import url from "node:url";
import { Construct } from "constructs";
import { RemovalPolicy, Stack, CustomResource, CfnOutput } from "aws-cdk-lib";
import { CfnAppMonitor } from "aws-cdk-lib/aws-rum";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime, Architecture } from "aws-cdk-lib/aws-lambda";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { PolicyStatement, type IRole, Role, Policy, Effect } from "aws-cdk-lib/aws-iam";

interface CloudwatchRumProps {
  guestRole: IRole;
  identityPoolId: string;
  domain: string;
}

export class CloudwatchRum extends Construct {
  constructor(scope: Construct, id: string, props: CloudwatchRumProps) {
    super(scope, id);

    const { guestRole, identityPoolId, domain } = props;

    // Create CloudWatch RUM AppMonitor
    const appMonitorPrefix = process.env.APP_MONITOR_NAME;
    const appMonitorName = `app-monitor-${Stack.of(this).stackName}`;
    const appmonitorArn = `arn:aws:rum:${Stack.of(this).region}:${Stack.of(this).account}:appmonitor/${appMonitorName}`;
    const appMonitor = new CfnAppMonitor(this, "AppMonitor", {
      domain,
      name: appMonitorName,
      appMonitorConfiguration: {
        allowCookies: true,
        enableXRay: true,
        guestRoleArn: guestRole.roleArn,
        identityPoolId,
        sessionSampleRate: 1,
        telemetries: ["errors", "http", "performance"],
      },
      cwLogEnabled: false,
    });

   
    // Create custom function to get AppMonitorId
    const functionName = `${appMonitorPrefix}Fn`;
    const logGroup = new LogGroup(this, `${functionName}LogGroup`, {
      logGroupName: `/aws/lambda/${functionName}`,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.ONE_DAY,
    });
    const customGetAppMonitorFn = new NodejsFunction(this, functionName, {
      functionName,
      entry: url.fileURLToPath(new URL("index.ts", import.meta.url)),
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      logGroup,
    });
    customGetAppMonitorFn.addToRolePolicy(
      new PolicyStatement({
        actions: ["rum:GetAppMonitor"],
        resources: [appmonitorArn],
      }),
    );
    const customResource = new CustomResource(this, `${appMonitorPrefix}CustomResource`, {
      serviceToken: customGetAppMonitorFn.functionArn,
      properties: {
        appMonitorName,
      },
    });
    customResource.node.addDependency(appMonitor);

    // Attach an inline policy to the guest role to allow it to send events to the AppMonitor
    const guestRoleResource = Role.fromRoleArn(this, `${appMonitorPrefix}GuestRole`, guestRole.roleArn);
    guestRoleResource.attachInlinePolicy(
      new Policy(this, "CwRumPolicy", {
        policyName: "CwRumPolicy",
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["rum:PutRumEvents"],
            resources: [appmonitorArn],
          }),
        ],
      }),
    );

    // Set the resources as outputs for easy access
    new CfnOutput(this, "AppMonitorName", {
      value: appMonitorName,
    });

    new CfnOutput(this, "AppMonitorId", {
      value: customResource.getAtt("AppMonitorId").toString(),
    });

    new CfnOutput(this, "GuestRoleArn", {
      value: guestRole.roleArn,
    });

    new CfnOutput(this, "IdentityPoolId", {
      value: identityPoolId,
    });
  }
}