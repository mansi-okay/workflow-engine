import { Router } from "express";
import authRouter from "../module/auth/routes/auth.routes.js"
import organizationRouter from "../module/organizations/routes/organization.routes.js"
import invitationRouter from "../module/organizations/routes/invitation.routes.js"

const router = Router()

router.use("/auth", authRouter)
router.use("/organizations", organizationRouter)
router.use("/invitations", invitationRouter)

export default router