import { Router } from "express";
import authRouter from "../module/auth/routes/auth.routes.js"

const router = Router()

router.use("/auth", authRouter)

export default router