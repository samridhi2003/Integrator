import { Router } from "express";
// import { authMiddleware } from "../middleware";
// import { SignupSchema, SigninSchema } from "../types";
import { prismaClient } from "../db";
// import jwt from "jsonwebtoken";
// import { JWT_PASSWORD } from "../config";

const router = Router();
 
router.get("/available" , async (req,res) =>{
    const availableActions = await prismaClient.availableAction.findMany({});
    res.json({
        availableActions
    })
})

export const actionRouter = router;