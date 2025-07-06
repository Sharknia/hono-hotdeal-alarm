import { getConfig } from '../config';
import { UserRepository } from '../repository/userRepository';
import { JwtPayload, LoginResponse, User, UserCreateRequest, UserLoginRequest, UserResponse } from '../types/auth';
import { generateJwtToken, hashPassword, verifyJwtToken, verifyPassword } from '../utils/crypto';

export class AuthService {
    private userRepository: UserRepository;
    private jwtSecret: string;

    constructor() {
        const config = getConfig();
        this.userRepository = new UserRepository();
        this.jwtSecret = config.jwtSecret;
    }

    // 로그인
    async login(loginRequest: UserLoginRequest): Promise<LoginResponse> {
        const { email, password } = loginRequest;

        // 이메일로 사용자 조회
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new Error('User not found');
        }

        // 계정 활성화 확인
        if (!user.is_active) {
            throw new Error('User account is not active');
        }

        // 비밀번호 검증
        const isPasswordValid = await verifyPassword(password, user.hashed_password);
        if (!isPasswordValid) {
            throw new Error('Invalid password');
        }

        // Access Token 생성 (1시간 유효)
        const jwtPayload: JwtPayload = {
            userId: user.id,
            email: user.email,
            authLevel: user.auth_level,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600, // 1시간
        };

        const accessToken = await generateJwtToken(jwtPayload, this.jwtSecret, 3600);

        return {
            access_token: accessToken,
            user_id: user.id,
        };
    }

    // 리프레시 토큰 생성 (7일 유효)
    async generateRefreshToken(userId: string, email: string): Promise<string> {
        const refreshPayload = {
            userId: userId,
            email: email,
            type: 'refresh',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 604800, // 7일
        };

        return await generateJwtToken(refreshPayload, this.jwtSecret, 604800);
    }

    // 토큰 갱신
    async refreshToken(refreshToken: string): Promise<LoginResponse> {
        try {
            // 리프레시 토큰 검증
            const payload = await verifyJwtToken(refreshToken, this.jwtSecret);

            if (payload.type !== 'refresh') {
                throw new Error('Invalid refresh token');
            }

            // 사용자 조회
            const user = await this.userRepository.findById(payload.userId);
            if (!user) {
                throw new Error('User not found');
            }

            // 계정 활성화 확인
            if (!user.is_active) {
                throw new Error('User account is not active');
            }

            // 새로운 Access Token 생성
            const jwtPayload: JwtPayload = {
                userId: user.id,
                email: user.email,
                authLevel: user.auth_level,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 3600, // 1시간
            };

            const accessToken = await generateJwtToken(jwtPayload, this.jwtSecret, 3600);

            return {
                access_token: accessToken,
                user_id: user.id,
            };
        } catch (error) {
            if (error instanceof Error && error.message === 'Token expired') {
                throw new Error('Refresh token expired');
            }
            throw new Error('Invalid refresh token');
        }
    }

    // 로그아웃 (JWT는 상태가 없어서 실제로는 클라이언트에서 토큰 삭제)
    async logout(userId: string): Promise<void> {
        // JWT는 상태가 없으므로 서버에서 할 작업이 없음
        // 필요하다면 블랙리스트 방식으로 구현할 수 있음
        return;
    }

    // 회원가입
    async register(createRequest: UserCreateRequest): Promise<UserResponse> {
        const { email, password, nickname } = createRequest;

        // 이메일 중복 확인
        const existingUserByEmail = await this.userRepository.findByEmail(email);
        if (existingUserByEmail) {
            throw new Error('Email already registered');
        }

        // 닉네임 중복 확인
        const existingUserByNickname = await this.userRepository.findByNickname(nickname);
        if (existingUserByNickname) {
            throw new Error('Nickname already taken');
        }

        // 비밀번호 해싱
        const hashedPassword = await hashPassword(password);

        // 사용자 생성
        const user = await this.userRepository.create({
            email,
            password,
            nickname,
            hashedPassword,
        });

        return this.mapUserToResponse(user);
    }

    // 내 정보 조회
    async getMe(userId: string): Promise<UserResponse> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        return this.mapUserToResponse(user);
    }

    // JWT 토큰 검증
    async verifyToken(token: string): Promise<JwtPayload> {
        try {
            const payload = await verifyJwtToken(token, this.jwtSecret);
            return payload as JwtPayload;
        } catch (error) {
            if (error instanceof Error && error.message === 'Token expired') {
                throw new Error('Token expired');
            }
            throw new Error('Invalid token');
        }
    }

    // User 모델을 UserResponse로 변환
    private mapUserToResponse(user: User): UserResponse {
        return {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            is_active: user.is_active,
            auth_level: user.auth_level,
        };
    }
}
