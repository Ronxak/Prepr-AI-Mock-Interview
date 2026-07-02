/** Envelope every API route returns. `fetch` helpers narrow on `error`. */
export type ApiSuccess<T> = { data: T };
export type ApiFailure = { error: { message: string; code?: string } };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;
