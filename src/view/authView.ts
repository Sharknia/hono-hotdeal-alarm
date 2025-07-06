import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { AuthService } from '../service/authService';
import { AuthEnv, JwtPayload, UserCreateRequest, UserLoginRequest } from '../types/auth';

// 확장된 환경 변수 타입
interface ExtendedAuthEnv extends AuthEnv {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    JWT_SECRET: string;
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

            const authService = new AuthService({
                SUPABASE_URL: c.env.SUPABASE_URL,
                SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
                JWT_SECRET: c.env.JWT_SECRET,
            });

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

            const authService = new AuthService({
                SUPABASE_URL: c.env.SUPABASE_URL,
                SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
                JWT_SECRET: c.env.JWT_SECRET,
            });

            const loginResponse = await authService.login(body);

            return c.json(loginResponse, 200);
        } catch (error) {
            if (error instanceof Error) {
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

    // 사용자 로그아웃
    app.post('/api/user/v1/logout', async (c) => {
        try {
            const authorization = c.req.header('authorization');
            if (!authorization) {
                return c.json({ detail: 'Authorization header is required' }, 401);
            }

            const token = authorization.replace('Bearer ', '');

            const authService = new AuthService({
                SUPABASE_URL: c.env.SUPABASE_URL,
                SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
                JWT_SECRET: c.env.JWT_SECRET,
            });

            // 토큰 검증
            const payload = await authService.verifyToken(token);

            // 로그아웃 처리
            await authService.logout(payload.userId);

            return c.json({ message: 'Logout successful' }, 200);
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === 'Invalid token') {
                    return c.json({ detail: 'Invalid token' }, 401);
                }
                if (error.message === 'User not found') {
                    return c.json({ detail: 'User not found' }, 404);
                }
            }
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

            const authService = new AuthService({
                SUPABASE_URL: c.env.SUPABASE_URL,
                SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
                JWT_SECRET: c.env.JWT_SECRET,
            });

            const loginResponse = await authService.refreshToken(refreshToken);

            return c.json(loginResponse, 200);
        } catch (error) {
            if (error instanceof Error) {
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

    // 내 정보 가져오기
    app.get('/api/user/v1/me', async (c) => {
        try {
            const authorization = c.req.header('authorization');
            if (!authorization) {
                return c.json({ detail: 'Authorization header is required' }, 401);
            }

            const token = authorization.replace('Bearer ', '');

            const authService = new AuthService({
                SUPABASE_URL: c.env.SUPABASE_URL,
                SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
                JWT_SECRET: c.env.JWT_SECRET,
            });

            // 토큰 검증
            const payload = await authService.verifyToken(token);

            // 사용자 정보 조회
            const user = await authService.getMe(payload.userId);

            return c.json(user, 200);
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === 'Invalid token') {
                    return c.json({ detail: 'Invalid token' }, 401);
                }
                if (error.message === 'User not found') {
                    return c.json({ detail: 'User not found' }, 404);
                }
            }
            return c.json({ detail: 'Internal server error' }, 500);
        }
    });

    return app;
}
