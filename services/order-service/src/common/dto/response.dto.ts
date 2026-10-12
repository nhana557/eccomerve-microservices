export interface ApiResponseMeta {
  timestamp: string;
  service: string;
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  error: null;
  meta: ApiResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
  };
  meta: ApiResponseMeta;
}
