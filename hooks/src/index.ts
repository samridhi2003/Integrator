import express from "express";
import { PrismaClient } from "@prisma/client";

const client= new PrismaClient();

const app= express();
app.use(express.json());

app.post("/hooks/catch/:userId/:zapId", async (req,res)=>{
    const userId= req.params.userId;
    const zapId=req.params.zapId; 
    const body= req.body;
    await client.$transaction(async tx => {
        const run= await tx.zapRun.create({
            data:{
                zapId: zapId,
                metadata: body,
            }
        });
        await tx.zapRunOutbox.create({
            data: {
                zapRunId: run.id
            }
        })
    })
    res.json ({
        message : "webhook recieved"
    })
})

app.listen(3002);