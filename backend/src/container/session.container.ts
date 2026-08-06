import { SessionRepository } from "../module/auth/repository/session.repository.js";
import { SessionService } from "../module/auth/services/session.service.js";
import { unitOfWork } from "./database.container.js";

export const sessionRepository = new SessionRepository()

export const sessionService = new SessionService(
    sessionRepository,
    unitOfWork
)