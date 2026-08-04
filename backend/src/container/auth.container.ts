import { AuthController } from "../module/auth/controllers/auth.controller.js";
import { SessionRepository } from "../module/auth/repository/session.repository.js";
import { VerificationTokenRepository } from "../module/auth/repository/verification_token.repository.js";
import { AuthService } from "../module/auth/services/auth.service.js";
import { VerificationService } from "../module/auth/services/verification.service.js";
import { UserRepository } from "../module/users/repository/user.repository.js";
import { UnitOfWork } from "../shared/database/unit_of_work.js";

const userRepository = new UserRepository()
const sessionRepository = new SessionRepository()
const verificationTokenRepository = new VerificationTokenRepository()

const unitOfWork = new UnitOfWork()

const authService = new AuthService(
    userRepository,
    sessionRepository,
    unitOfWork
)

const verificationService = new VerificationService(
    verificationTokenRepository,
    userRepository,
    unitOfWork
)

export const authController = new AuthController(
    authService,
    verificationService
)