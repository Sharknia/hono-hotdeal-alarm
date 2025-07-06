import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { authMiddleware } from '../middleware/authMiddleware';
import { AuthService } from '../service/authService';
import { AuthEnv, JwtPayload, UserCreateRequest, UserLoginRequest } from '../types/auth';

// 확장된 환경 변수 타입 (Secrets Store 사용)
interface ExtendedAuthEnv extends AuthEnv {
    SUPABASE_URL: { get(): Promise<string> };
    SUPABASE_ANON_KEY: { get(): Promise<string> };
    SUPABASE_SERVICE_ROLE_KEY: { get(): Promise<string> };
    JWT_SECRET: { get(): Promise<string> };
}

export function createAuthRoutes() {
    const app = new Hono<{ Bindings: ExtendedAuthEnv; Variables: { user?: JwtPayload } }>();

    // 사용자 회원가입
    app.post('/api/user/v1/', async (c) => {
        try {
            const body = (await c.req.json()) as UserCreateRequest;

            // 요청 데이터 검증
            if (!body.email || !body.password || !body.nickname) {
                return c.json({ detail: 'Email, password, and nickname are required' }, 422);
            }

            const authService = new AuthService();

            const user = await authService.register(body);

            return c.json(user, 201);
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === 'Email already registered') {
                    return c.json({ detail: 'Email already registered' }, 400);
                }
                if (error.message === 'Nickname already taken') {
                    return c.json({ detail: 'Nickname already taken' }, 400);
                }
            }
            return c.json({ detail: 'Internal server error' }, 500);
        }
    });

    // 사용자 로그인
    app.post('/api/user/v1/login', async (c) => {
        try {
            const body = (await c.req.json()) as UserLoginRequest;

            // 요청 데이터 검증
            if (!body.email || !body.password) {
                return c.json({ detail: 'Email and password are required' }, 422);
            }

            const authService = new AuthService();

            // 로그인 처리
            const loginResponse = await authService.login(body);

            // 리프레시 토큰 생성 및 쿠키 설정
            const refreshToken = await authService.generateRefreshToken(loginResponse.user_id, body.email);

            setCookie(c, 'refresh_token', refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                path: '/',
                maxAge: 604800, // 7일
            });

            return c.json(loginResponse, 200);
        } catch (error) {
            console.error('로그인 에러:', error);
            if (error instanceof Error) {
                console.error('에러 메시지:', error.message);
                console.error('에러 스택:', error.stack);
                if (error.message === 'User not found') {
                    return c.json({ detail: 'User not found' }, 404);
                }
                if (error.message === 'User account is not active') {
                    return c.json({ detail: 'User account is not active' }, 401);
                }
                if (error.message === 'Invalid password') {
                    return c.json({ detail: 'Invalid password' }, 401);
                }
            }
            return c.json({ detail: 'Internal server error' }, 500);
        }
    });

    // 사용자 로그아웃 (인증 미들웨어 적용)
    app.post('/api/user/v1/logout', authMiddleware(), async (c) => {
        try {
            const user = c.get('user')!;

            const authService = new AuthService();

            // 로그아웃 처리
            await authService.logout(user.userId);

            // 리프레시 토큰 쿠키 삭제
            deleteCookie(c, 'refresh_token', {
                path: '/',
                secure: true,
                sameSite: 'None',
            });

            return c.json({ message: 'Logout successful' }, 200);
        } catch (error) {
            return c.json({ detail: 'Internal server error' }, 500);
        }
    });

    // 액세스 토큰 갱신
    app.post('/api/user/v1/token/refresh', async (c) => {
        try {
            const refreshToken = getCookie(c, 'refresh_token');

            if (!refreshToken) {
                return c.json({ detail: 'Refresh token is required' }, 401);
            }

            const authService = new AuthService();

            const loginResponse = await authService.refreshToken(refreshToken);

            return c.json(loginResponse, 200);
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === 'Refresh token expired') {
                    // 만료된 리프레시 토큰 쿠키 삭제
                    deleteCookie(c, 'refresh_token', {
                        path: '/',
                        secure: true,
                        sameSite: 'None',
                    });
                    return c.json({ detail: 'Refresh token expired' }, 401);
                }
                if (error.message === 'Invalid refresh token') {
                    return c.json({ detail: 'Refresh token expired' }, 401);
                }
                if (error.message === 'User not found') {
                    return c.json({ detail: 'User not found' }, 404);
                }
                if (error.message === 'User account is not active') {
                    return c.json({ detail: 'User account is not active' }, 401);
                }
            }
            return c.json({ detail: 'Internal server error' }, 500);
        }
    });

    // 내 정보 가져오기 (인증 미들웨어 적용)
    app.get('/api/user/v1/me', authMiddleware(), async (c) => {
        try {
            const user = c.get('user')!;

            const authService = new AuthService();

            // 사용자 정보 조회
            const userInfo = await authService.getMe(user.userId);

            return c.json(userInfo, 200);
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === 'User not found') {
                    return c.json({ detail: 'User not found' }, 404);
                }
            }
            return c.json({ detail: 'Internal server error' }, 500);
        }
    });

    return app;
}
