import "express-serve-static-core";
import { Logger } from "pino";
import { AuthContext, MembershipContext, OrganizationContext } from "./request_context.js";

declare module "express-serve-static-core"{
  export interface Request{
    requestId: string
    logger: Logger
    auth?: AuthContext
    organization?: OrganizationContext
    membership? :MembershipContext
  }
}