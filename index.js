#!/usr/bin/env node
import { SFNClient, StartExecutionCommand, DescribeExecutionCommand } from '@aws-sdk/client-sfn';
import { fromIni } from '@aws-sdk/credential-providers';
import { Command } from 'commander';
import winston from 'winston';
import { readFileSync } from 'fs';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}] ${message}`)
  ),
  transports: [
    new winston.transports.Stream({ stream: process.stderr }),
  ],
});

const program = new Command();
program
  .requiredOption('-a, --arn <arn>', 'State Machine ARN')
  .option('-f, --input <path>', 'path to JSON file used as execution input')
  .option('-d, --data <json>', 'JSON string used as execution input')
  .option('-p, --profile <profile>', 'AWS profile name')
  .option('-i, --interval <seconds>', 'polling interval in seconds', (v) => parseInt(v, 10), 5);

program.parse();
const options = program.opts();

async function poll(client, executionArn, interval) {
  let status = 'RUNNING';
  let result;

  while (status === 'RUNNING') {
    result = await client.send(new DescribeExecutionCommand({ executionArn }));
    status = result.status;
    logger.info(`status: ${status}`);
    if (status === 'RUNNING') {
      await new Promise((resolve) => setTimeout(resolve, interval * 1000));
    }
  }

  return result;
}

async function main() {
  if (!options.input && !options.data) {
    logger.error('either --input or --data is required');
    process.exit(1);
  }

  let inputJson;
  if (options.data) {
    try {
      inputJson = JSON.parse(options.data);
    } catch {
      logger.error('failed to parse --data as JSON');
      process.exit(1);
    }
  } else {
    try {
      inputJson = JSON.parse(readFileSync(options.input, 'utf8'));
    } catch (err) {
      if (err.code === 'ENOENT') {
        logger.error(`input file not found: ${options.input}`);
      } else {
        logger.error(`failed to parse input file: ${err.message}`);
      }
      process.exit(1);
    }
  }

  const clientConfig = {};
  if (options.profile) {
    clientConfig.credentials = fromIni({ profile: options.profile });
  }
  const client = new SFNClient(clientConfig);

  logger.info(`starting execution: ${options.arn}`);
  const { executionArn } = await client.send(new StartExecutionCommand({
    stateMachineArn: options.arn,
    input: JSON.stringify(inputJson),
  }));
  logger.info(`execution started: ${executionArn}`);

  const result = await poll(client, executionArn, options.interval);

  if (result.status === 'SUCCEEDED') {
    process.stdout.write(JSON.stringify(JSON.parse(result.output), null, 2) + '\n');
  } else {
    logger.error(`execution ${result.status}${result.cause ? `: ${result.cause}` : ''}`);
    process.exit(1);
  }
}

try {
  await main();
} catch (err) {
  logger.error(err.message);
  process.exit(1);
}
