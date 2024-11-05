"use strict";
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
const client_1 = require("@prisma/client");
const prismaClient = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield prismaClient.availableTrigger.create({
            data: {
                id: "webhook",
                name: "Webhook",
                image: "data:image/jpeg;base64,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"
            }
        });
        yield prismaClient.availableAction.create({
            data: {
                id: "send-sol",
                name: "Send Solana",
                image: ""
            }
        });
    });
}
