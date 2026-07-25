import "express-serve-static-core";
import { Logger } from "pino";

declare module "express-serve-static-core"{
  export interface Request{
    requestId: string
    logger: Logger
  }
}