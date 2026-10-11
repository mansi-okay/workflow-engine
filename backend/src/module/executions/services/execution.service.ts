import type { ExecutionRepository } from "../repository/execution.repository.js";
import type { ExecutionListResult } from "../types/execution.types.js";
import type { ExecutionListQueryInput } from "../validations/execution_list.schema.js";

export class ExecutionService{
    constructor(
        private readonly executionRepository: ExecutionRepository
    ){}

    async listExecutions(
        organizationId: string,
        pagination: ExecutionListQueryInput
    ): Promise<ExecutionListResult>{
        return await this.executionRepository.findByOrganizationId(
            organizationId,
            pagination
        )
    }
}