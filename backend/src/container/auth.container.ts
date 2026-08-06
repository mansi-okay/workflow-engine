import { AuthController } from "../module/auth/controllers/auth.controller.js";
import { VerificationTokenRepository } from "../module/auth/repository/verification_token.repository.js";
import { AuthService } from "../module/auth/services/auth.service.js";
import { VerificationService } from "../module/auth/services/verification.service.js";
import { UserRepository } from "../module/users/repository/user.repository.js";
import { AuditRepository } from "../shared/audit/audit.repository.js";
import { unitOfWork } from "./database.container.js";
import { sessionService } from "./session.container.js";

const userRepository = new UserRepository()
const verificationTokenRepository = new VerificationTokenRepository()
const auditRepository = new AuditRepository()

const authService = new AuthService(
    userRepository,
    unitOfWork,
    sessionService,
    auditRepository
)

const verificationService = new VerificationService(
    verificationTokenRepository,
    userRepository,
    unitOfWork
)

export const authController = new AuthController(
    authService,
    verificationService,
    sessionService
)