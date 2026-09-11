import { IdempotencyRepository } from "../shared/idempotency/idempotency.repository.js";
import { IdempotencyService } from "../shared/idempotency/idempotency.service.js";

export const idempotencyRepository = new IdempotencyRepository()

export const idempotencyService = new IdempotencyService(idempotencyRepository)