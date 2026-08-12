import { OrganizationController } from "../module/organizations/controllers/organization.controller.js";
import { MembershipRepository } from "../module/organizations/repository/membership.repository.js";
import { OrganizationService } from "../module/organizations/services/organization.service.js";
import { unitOfWork } from "./database.container.js";
import { loadOrganizationContext } from "../module/organizations/middlewares/load_organization_context.middleware.js";
import { OrganizationRepository } from "../module/organizations/repository/organization.repository.js";
import { MembershipService } from "../module/organizations/services/membership.service.js";

const membershipRepository = new MembershipRepository()
const organizationRepository = new OrganizationRepository()

const organizationService = new OrganizationService(
    unitOfWork,
    membershipRepository,
    organizationRepository
)

const membershipService = new MembershipService(
    membershipRepository,
    unitOfWork
)

export const organizationController = new OrganizationController(
    organizationService,
    membershipService
)

export const organizationContext = loadOrganizationContext(membershipRepository)