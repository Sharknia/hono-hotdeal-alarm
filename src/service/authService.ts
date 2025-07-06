import { UserRepository } from '../repository/userRepository';
import { AuthEnv, JwtPayload, LoginResponse, User, UserCreateRequest, UserLoginRequest, UserResponse } from '../types/auth';
import { generateJwtToken, generateRefreshToken, hashPassword, verifyJwtToken, verifyPassword } from '../utils/crypto';

export class AuthService {
    private userRepository: UserRepository;
    private jwtSecret: string;

    constructor(env: AuthEnv) {
        this.userRepository = new UserRepository(env);
        this.jwtSecret = env.JWT_SECRET;
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

        // JWT 토큰 생성
        const jwtPayload: JwtPayload = {
            userId: user.id,
            email: user.email,
            authLevel: user.auth_level,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600, // 1시간
        };

        const accessToken = await generateJwtToken(jwtPayload, this.jwtSecret, 3600);

        // 리프레시 토큰 생성 및 저장
        const refreshToken = await generateRefreshToken();
        await this.userRepository.updateRefreshToken(user.id, refreshToken);

        return {
            access_token: accessToken,
            user_id: user.id,
        };
    }

    // 로그아웃
    async logout(userId: string): Promise<void> {
        // 리프레시 토큰 제거
        await this.userRepository.updateRefreshToken(userId, null);
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

    // 토큰 갱신
    async refreshToken(refreshToken: string): Promise<LoginResponse> {
        // 리프레시 토큰으로 사용자 조회
        const user = await this.userRepository.findByRefreshToken(refreshToken);
        if (!user) {
            throw new Error('Invalid refresh token');
        }

        // 계정 활성화 확인
        if (!user.is_active) {
            throw new Error('User account is not active');
        }

        // 새로운 JWT 토큰 생성
        const jwtPayload: JwtPayload = {
            userId: user.id,
            email: user.email,
            authLevel: user.auth_level,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600, // 1시간
        };

        const accessToken = await generateJwtToken(jwtPayload, this.jwtSecret, 3600);

        // 새로운 리프레시 토큰 생성 및 저장
        const newRefreshToken = await generateRefreshToken();
        await this.userRepository.updateRefreshToken(user.id, newRefreshToken);

        return {
            access_token: accessToken,
            user_id: user.id,
        };
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
