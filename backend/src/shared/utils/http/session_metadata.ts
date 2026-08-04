import { Request } from "express"
import { UAParser } from "ua-parser-js"
import { SessionMetadata } from "../../types/session.types.js"

export const getSessionMetadata = (req: Request): SessionMetadata => {
    const parser = new UAParser(req.get("user-agent"))

    const browser = parser.getBrowser()
    const os = parser.getOS()
    const device = parser.getDevice()

    return {
        ipAddress: req.ip,
        userAgent: req.get("user-agent") ?? undefined,
        deviceName: device.model ?? `${browser.name} on ${os.name}`
    }
}