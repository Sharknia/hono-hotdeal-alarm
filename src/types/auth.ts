// 인증 레벨 열거형
export enum AuthLevel {
    USER = 1,
    ADMIN = 9,
}

// 유저 모델 타입
export interface User {
    id: string;
    nickname: string;
    email: string;
    hashed_password: string;
    auth_level: AuthLevel;
    is_active: boolean;
    refresh_token: string | null;
    created_at: string;
    updated_at: string;
}

// 로그인 요청 타입
export interface UserLoginRequest {
    email: string;
    password: string;
}

// 로그인 응답 타입
export interface LoginResponse {
    access_token: string;
    user_id: string;
}

// 로그아웃 응답 타입
export interface LogoutResponse {
    message: string;
}

// 사용자 응답 타입
export interface UserResponse {
id: string;
    email: string;
    nickname: string;
    is_active: boolean;
    auth_level: AuthLevel;
}

// 회원가입 요청 타입
export interface UserCreateRequest {
    email: string;
    password: string;
    nickname: string;
}

// JWT 페이로드 타입
export interface JwtPayload {
    userId: string;
    email: string;
    authLevel: AuthLevel;
    iat: number;
    exp: number;
}

// 환경 변수 타입
export interface AuthEnv {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    JWT_SECRET: string;
}
