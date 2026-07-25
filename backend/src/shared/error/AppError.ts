export class AppError extends Error{
    constructor (
        message: string,
        public readonly statusCode: number,
        public readonly isOperational = true
    ){
        super(message)
        Error.captureStackTrace(this, this.constructor)
    }
}