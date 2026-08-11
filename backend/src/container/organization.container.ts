import { OrganizationController } from "../module/organizations/controllers/organization.controller.js";
import { MembershipRepository } from "../module/organizations/repository/membership.repository.js";
import { OrganizationService } from "../module/organizations/services/organization.service.js";
import { unitOfWork } from "./database.container.js";
import { loadOrganizationContext } from "../shared/middleware/load_organization_context.middleware.js";
import { OrganizationRepository } from "../module/organizations/repository/organization.repository.js";

const membershipRepository = new MembershipRepository()
const organizationRepository = new OrganizationRepository()

const organizationService = new OrganizationService(
    unitOfWork,
    membershipRepository,
    organizationRepository
)

export const organizationController = new OrganizationController(organizationService)

export const organizationContext = loadOrganizationContext(membershipRepository)