import { Organization } from "@prisma/client";
import { type OrganizationResponseDto } from "../dtos/organization_response.dto.js";

export const toOrganizationResponseDto = (
    organization: Organization
): OrganizationResponseDto => ({
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    description: organization.description,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString()
})