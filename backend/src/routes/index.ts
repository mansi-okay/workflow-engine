import { Router } from "express";
import authRouter from "../module/auth/routes/auth.routes.js"
import organizationRouter from "../module/organizations/routes/organization.routes.js"

const router = Router()

router.use("/auth", authRouter)
router.use("/organizations", organizationRouter)

export default router