import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { SessionRepository } from "../../module/auth/repository/session.repository.js";
import { VerificationTokenRepository } from "../../module/auth/repository/verification_token.repository.js";
import { UserRepository } from "../../module/users/repository/user.repository.js";
import { AuditRepository } from "../audit/audit.repository.js";
import { TransactionRepositories } from "./transaction_repositories.js";

export class UnitOfWork {

    async transaction<T>(
        callback: (repos: TransactionRepositories) => Promise<T>
    ): Promise<T>{  
        return prisma.$transaction(async (tx) => {
            return callback(this.createRepositories(tx))
        })
    }

    private createRepositories(
        tx: Prisma.TransactionClient
    ): TransactionRepositories {
        return {
            users: new UserRepository(tx),
            sessions: new SessionRepository(tx),
            verificationTokens: new VerificationTokenRepository(tx),
            auditLogs: new AuditRepository(tx)
        }
    }
}