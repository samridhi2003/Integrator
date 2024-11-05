require('dotenv').config()
import { PrismaClient } from '@prisma/client';
import { Kafka, logLevel } from 'kafkajs';
import * as fs from 'fs';
import { JsonObject } from '@prisma/client/runtime/library';
import { parse }   from './parser';
import { sendEmail } from './email';
import { sendSol } from './solana';

const prismaClient = new PrismaClient();
const TOPIC_NAME = "integrator";

// Configure Kafka client for Aiven
const kafka = new Kafka({
    clientId: 'outbox-processor',
    brokers: [process.env.KAFKA_URL!],
    ssl: {
        ca: [fs.readFileSync('./ca.pem', 'utf-8')],
        key: fs.readFileSync('./service.key', 'utf-8'),
        cert: fs.readFileSync('./service.cert', 'utf-8')
    },
    logLevel: logLevel.ERROR
});

async function main() {
    const consumer = kafka.consumer({ groupId: 'main-worker' });
    const producer = kafka.producer();
    
    
    try {
        await consumer.connect();
        console.log('Consumer connected');
        await producer.connect();   
        await consumer.subscribe({ 
            topic: TOPIC_NAME, 
            fromBeginning: true 
        });
        
        await consumer.run({
            autoCommit: false,
            eachMessage: async ({ topic, partition, message }) => {
                try {
                    console.log({
                        partition,
                        offset: message.offset,
                        value: message.value?.toString(),
                    });
                    if(!message.value?.toString()){
                      return;
                    }
                    const parsedValue = JSON.parse(message.value?.toString());
                    const zapRunId = parsedValue.zapRunId;
                    const stage = parsedValue.stage;

                    const zapRunDetails = await prismaClient.zapRun.findFirst({
                      where: {
                        id: zapRunId,
                      },
                      include:{
                        zap: {
                          include: {
                            actions:{
                              include: {
                                type: true
                              }
                            }
                          }
                        }

                      }
                    });

                    const currentAction = zapRunDetails?.zap.actions.find(x => x.sortingOrder=== stage);

                    if(!currentAction){
                      console.log("Current Action Not found");
                      return;
                    }
                    console.log(currentAction);
                    const zapRunMetadata = zapRunDetails?.metadata;
                    if(currentAction.type.id === "email"){
                      const body = parse((currentAction.metadata as JsonObject)?.body as string, zapRunMetadata);
                      const to = parse((currentAction.metadata as JsonObject)?.email as string, zapRunMetadata);
                      console.log(`Sending email to ${to} body is ${body}`);
                      await sendEmail(to, body);
                       
                    }
                    if(currentAction.type.id === "send-sol"){
                      const amount = parse((currentAction.metadata as JsonObject)?.amount as string, zapRunMetadata);
                      const address = parse((currentAction.metadata as JsonObject)?.address as string, zapRunMetadata);
                      console.log(`Sending out SOL of ${amount} to address ${address}`);
                      await sendSol(address, amount);
                    }
                    
                    // Processing delay of 50ms
                    await new Promise(r => setTimeout(r, 500));
                    const zapId = message.value?.toString();
                    const lastStage = (zapRunDetails?.zap.actions?.length || 1)-1;

                    if(lastStage !== stage){
                      await producer.send({
                        topic: TOPIC_NAME,
                        messages: [{
                          value: JSON.stringify({
                            stage : stage + 1,
                            zapRunId
                          })
                        }]
                      })
                    }
                    console.log("processing done");
                    
                    // Commit the offset
                    await consumer.commitOffsets([{
                        topic: "integrator",
                        partition: partition,
                        offset: (parseInt(message.offset) + 1).toString()
                    }]);
                } catch (error) {
                    console.error('Error processing message:', error);
                }
            },
        });
    } catch (error) {
        console.error('Consumer error:', error);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down consumer...');
    try {
        const consumer = kafka.consumer({ groupId: 'main-worker' });
        await consumer.disconnect();
    } catch (error) {
        console.error('Error during shutdown:', error);
    }
});

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});