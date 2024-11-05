"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const client_1 = require("@prisma/client");
const kafkajs_1 = require("kafkajs");
const fs = __importStar(require("fs"));
const parser_1 = require("./parser");
const email_1 = require("./email");
const solana_1 = require("./solana");
const prismaClient = new client_1.PrismaClient();
const TOPIC_NAME = "integrator";
// Configure Kafka client for Aiven
const kafka = new kafkajs_1.Kafka({
    clientId: 'outbox-processor',
    brokers: [process.env.KAFKA_URL],
    ssl: {
        ca: [fs.readFileSync('./ca.pem', 'utf-8')],
        key: fs.readFileSync('./service.key', 'utf-8'),
        cert: fs.readFileSync('./service.cert', 'utf-8')
    },
    logLevel: kafkajs_1.logLevel.ERROR
});
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const consumer = kafka.consumer({ groupId: 'main-worker' });
        const producer = kafka.producer();
        try {
            yield consumer.connect();
            console.log('Consumer connected');
            yield producer.connect();
            yield consumer.subscribe({
                topic: TOPIC_NAME,
                fromBeginning: true
            });
            yield consumer.run({
                autoCommit: false,
                eachMessage: (_a) => __awaiter(this, [_a], void 0, function* ({ topic, partition, message }) {
                    var _b, _c, _d, _e, _f, _g, _h, _j, _k;
                    try {
                        console.log({
                            partition,
                            offset: message.offset,
                            value: (_b = message.value) === null || _b === void 0 ? void 0 : _b.toString(),
                        });
                        if (!((_c = message.value) === null || _c === void 0 ? void 0 : _c.toString())) {
                            return;
                        }
                        const parsedValue = JSON.parse((_d = message.value) === null || _d === void 0 ? void 0 : _d.toString());
                        const zapRunId = parsedValue.zapRunId;
                        const stage = parsedValue.stage;
                        const zapRunDetails = yield prismaClient.zapRun.findFirst({
                            where: {
                                id: zapRunId,
                            },
                            include: {
                                zap: {
                                    include: {
                                        actions: {
                                            include: {
                                                type: true
                                            }
                                        }
                                    }
                                }
                            }
                        });
                        const currentAction = zapRunDetails === null || zapRunDetails === void 0 ? void 0 : zapRunDetails.zap.actions.find(x => x.sortingOrder === stage);
                        if (!currentAction) {
                            console.log("Current Action Not found");
                            return;
                        }
                        console.log(currentAction);
                        const zapRunMetadata = zapRunDetails === null || zapRunDetails === void 0 ? void 0 : zapRunDetails.metadata;
                        if (currentAction.type.id === "email") {
                            const body = (0, parser_1.parse)((_e = currentAction.metadata) === null || _e === void 0 ? void 0 : _e.body, zapRunMetadata);
                            const to = (0, parser_1.parse)((_f = currentAction.metadata) === null || _f === void 0 ? void 0 : _f.email, zapRunMetadata);
                            console.log(`Sending email to ${to} body is ${body}`);
                            yield (0, email_1.sendEmail)(to, body);
                        }
                        if (currentAction.type.id === "send-sol") {
                            const amount = (0, parser_1.parse)((_g = currentAction.metadata) === null || _g === void 0 ? void 0 : _g.amount, zapRunMetadata);
                            const address = (0, parser_1.parse)((_h = currentAction.metadata) === null || _h === void 0 ? void 0 : _h.address, zapRunMetadata);
                            console.log(`Sending out SOL of ${amount} to address ${address}`);
                            yield (0, solana_1.sendSol)(address, amount);
                        }
                        // Processing delay of 50ms
                        yield new Promise(r => setTimeout(r, 500));
                        const zapId = (_j = message.value) === null || _j === void 0 ? void 0 : _j.toString();
                        const lastStage = (((_k = zapRunDetails === null || zapRunDetails === void 0 ? void 0 : zapRunDetails.zap.actions) === null || _k === void 0 ? void 0 : _k.length) || 1) - 1;
                        if (lastStage !== stage) {
                            yield producer.send({
                                topic: TOPIC_NAME,
                                messages: [{
                                        value: JSON.stringify({
                                            stage: stage + 1,
                                            zapRunId
                                        })
                                    }]
                            });
                        }
                        console.log("processing done");
                        // Commit the offset
                        yield consumer.commitOffsets([{
                                topic: "integrator",
                                partition: partition,
                                offset: (parseInt(message.offset) + 1).toString()
                            }]);
                    }
                    catch (error) {
                        console.error('Error processing message:', error);
                    }
                }),
            });
        }
        catch (error) {
            console.error('Consumer error:', error);
        }
    });
}
// Handle graceful shutdown
process.on('SIGTERM', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Shutting down consumer...');
    try {
        const consumer = kafka.consumer({ groupId: 'main-worker' });
        yield consumer.disconnect();
    }
    catch (error) {
        console.error('Error during shutdown:', error);
    }
}));
// Handle uncaught errors
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
