import { StatusCodes } from "http-status-codes"

type DomainErrorStatus =
  | StatusCodes.BAD_REQUEST
  | StatusCodes.FORBIDDEN
  | StatusCodes.CONFLICT
  | StatusCodes.TOO_MANY_REQUESTS
  | StatusCodes.NOT_FOUND
  | StatusCodes.UNSUPPORTED_MEDIA_TYPE
  | StatusCodes.INTERNAL_SERVER_ERROR

export class DomainError extends Error {
  readonly key: string
  readonly status: DomainErrorStatus

  constructor(key: string, status: DomainErrorStatus) {
    super(key)
    this.key = key
    this.status = status
  }
}

export const notFound = (key: string) =>
  new DomainError(key, StatusCodes.NOT_FOUND)

export const invalidInput = (key: string) =>
  new DomainError(key, StatusCodes.BAD_REQUEST)

export const unsupportedMediaType = (key: string) =>
  new DomainError(key, StatusCodes.UNSUPPORTED_MEDIA_TYPE)

export const serverError = (key: string) =>
  new DomainError(key, StatusCodes.INTERNAL_SERVER_ERROR)

export const forbidden = (key: string) =>
  new DomainError(key, StatusCodes.FORBIDDEN)

export const conflict = (key: string) =>
  new DomainError(key, StatusCodes.CONFLICT)

export const tooManyRequests = (key: string) =>
  new DomainError(key, StatusCodes.TOO_MANY_REQUESTS)
