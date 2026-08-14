import { OrganizationController } from "../module/organizations/controllers/organization.controller.js";
import { MembershipRepository } from "../module/organizations/repository/membership.repository.js";
import { OrganizationService } from "../module/organizations/services/organization.service.js";
import { unitOfWork } from "./database.container.js";
import { loadOrganizationContext } from "../module/organizations/middlewares/load_organization_context.middleware.js";
import { OrganizationRepository } from "../module/organizations/repository/organization.repository.js";
import { MembershipService } from "../module/organizations/services/membership.service.js";
import { InvitationService } from "../module/organizations/services/invitation.service.js";
import { userRepository } from "./auth.container.js";
import { InvitationRepository } from "../module/organizations/repository/invitation.repository.js";

const membershipRepository = new MembershipRepository()
const organizationRepository = new OrganizationRepository()
const invitationRepository = new InvitationRepository()

const organizationService = new OrganizationService(
    unitOfWork,
    membershipRepository,
    organizationRepository
)

const membershipService = new MembershipService(
    membershipRepository,
    unitOfWork
)

const invitationService = new InvitationService(
    userRepository,
    invitationRepository,
    membershipRepository,
    unitOfWork
)

export const organizationController = new OrganizationController(
    organizationService,
    membershipService,
    invitationService
)

export const organizationContext = loadOrganizationContext(membershipRepository)