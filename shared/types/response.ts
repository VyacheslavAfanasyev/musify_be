export interface IBaseResponse {
  success: boolean;
  error?: string;
}

export interface IAuthErrorResponse {
  success: false;
  error: string;
}

export interface IAuthUserSuccessResponse {
  success: true;
  user: unknown;
}

export interface IAuthTokensSuccessResponse {
  success: true;
  user: unknown;
  accessToken: string;
  refreshToken: string;
}

export type IRegisterResponse = IAuthUserSuccessResponse | IAuthErrorResponse;

export type ILoginResponse = IAuthTokensSuccessResponse | IAuthErrorResponse;

export type IRefreshResponse = IAuthTokensSuccessResponse | IAuthErrorResponse;
