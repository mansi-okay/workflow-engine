import type { Execution, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type { CreateExecutionInput, ExecutionListResult } from "../types/execution.types.js";
import type { ExecutionListQueryInput } from "../validations/execution_list.schema.js";
import { decodeCursor, encodeCursor } from "../../../shared/utils/pagination/cursor.js";
import { executionCursorSchema } from "../validations/execution_cursor.schema.js";

export class ExecutionRepository{
    constructor (private readonly db:
        PrismaClient |
        Prisma.TransactionClient = prisma
    ) {}

    async create(data: CreateExecutionInput): Promise<Execution>{
        return this.db.execution.create({
            data: {
                workflowId: data.workflowId,
                workflowVersionId: data.workflowVersionId,
                triggerType: data.triggerType,
                input: data.input
            }
        })
    }

    async findByOrganizationId(
        organizationId: string,
        {limit, cursor, status, workflowId}: ExecutionListQueryInput
    ): Promise<ExecutionListResult>{
        const decodedCursor = cursor ? decodeCursor(cursor, executionCursorSchema) : undefined

        const executions = await this.db.execution.findMany({
            where: {
                workflow: {
                    organizationId
                },
                ...(status && {
                    status
                }),
                ...(workflowId && {
                    workflowId
                }),
                ...(decodedCursor && {
                    OR: [
                        {
                            createdAt: {
                                lt: decodedCursor.timestamp
                            }
                        },
                        {
                            createdAt: decodedCursor.timestamp,
                            id: {
                                lt: decodedCursor.id
                            }
                        }
                    ]
                })
            },
            orderBy: [
                {createdAt: "desc"},
                {id: "desc"}
            ],
            take: limit+1
        })

        const hasNextPage = executions.length > limit

        const items = hasNextPage
        ? executions.slice(0, limit)
        : executions

        const lastExecution = items[items.length-1]

        const nextCursor = hasNextPage && lastExecution
        ? encodeCursor({
            timestamp: lastExecution.createdAt,
            id: lastExecution.id
        })
        : null

        return {
            executions: items,
            pagination: {
                nextCursor,
                hasNextPage
            }
        }
    }
}