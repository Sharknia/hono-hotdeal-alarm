import { Context, Next } from 'hono';
import { AuthService } from '../service/authService';
import { AuthLevel, JwtPayload } from '../types/auth';

// 환경 변수 타입
interface AuthEnv {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    JWT_SECRET: string;
}

// 컨텍스트 변수 타입
interface AuthVariables {
    user: JwtPayload;
}

// Authorization 헤더에서 JWT 토큰 추출
export function extractBearerToken(authHeader: string | undefined): string | null {
    if (!authHeader) {
        return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }

    return parts[1];
}

// 기본 인증 미들웨어
export function authMiddleware() {
    return async (c: Context<{ Bindings: AuthEnv; Variables: { user?: JwtPayload } }>, next: Next) => {
        try {
            const authHeader = c.req.header('Authorization');

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return c.json({ detail: 'Authorization header is required' }, 401);
            }

            const token = authHeader.split(' ')[1];

            const authService = new AuthService({
                SUPABASE_URL: c.env.SUPABASE_URL,
                SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
                SUPABASE_SERVICE_ROLE_KEY: c.env.SUPABASE_SERVICE_ROLE_KEY,
                JWT_SECRET: c.env.JWT_SECRET,
            });

            const payload = await authService.verifyToken(token);

            // 액세스 토큰에만 적용 (리프레시 토큰은 제외)
            if (payload.type === 'refresh') {
                return c.json({ detail: 'Invalid token type' }, 401);
            }

            // 사용자 활성화 상태 확인
            const user = await authService.getMe(payload.userId);
            if (!user.is_active) {
                return c.json({ detail: 'User account is not active' }, 401);
            }

            c.set('user', payload);
            await next();
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === 'Token expired') {
                    return c.json({ detail: 'Access token expired' }, 401);
                }
                if (error.message === 'Invalid token') {
                    return c.json({ detail: 'Invalid token' }, 401);
                }
                if (error.message === 'User not found') {
                    return c.json({ detail: 'User not found' }, 404);
                }
            }
            return c.json({ detail: 'Authentication failed' }, 401);
        }
    };
}

// 관리자 권한 확인 미들웨어
export function adminMiddleware() {
    return async (c: Context<{ Bindings: AuthEnv; Variables: { user?: JwtPayload } }>, next: Next) => {
        try {
            const user = c.get('user');

            if (!user || user.authLevel !== AuthLevel.ADMIN) {
                return c.json({ detail: 'Admin privileges required' }, 403);
            }

            await next();
        } catch (error) {
            return c.json({ detail: 'Authorization failed' }, 403);
        }
    };
}

// 활성 사용자 확인 미들웨어 (이미 authMiddleware에서 확인하지만 별도 사용 가능)
export function activeUserMiddleware() {
    return async (c: Context<{ Bindings: AuthEnv; Variables: { user?: JwtPayload } }>, next: Next) => {
        try {
            const user = c.get('user');

            if (!user) {
                return c.json({ detail: 'User not authenticated' }, 401);
            }

            const authService = new AuthService({
                SUPABASE_URL: c.env.SUPABASE_URL,
                SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
                SUPABASE_SERVICE_ROLE_KEY: c.env.SUPABASE_SERVICE_ROLE_KEY,
                JWT_SECRET: c.env.JWT_SECRET,
            });

            const userInfo = await authService.getMe(user.userId);

            if (!userInfo.is_active) {
                return c.json({ detail: 'User account is not active' }, 401);
            }

            await next();
        } catch (error) {
            return c.json({ detail: 'User status verification failed' }, 401);
        }
    };
}

// 인증 헬퍼 함수 (미들웨어 없이 직접 사용)
export async function authenticateUser(c: Context<{ Bindings: AuthEnv }>): Promise<JwtPayload | null> {
    try {
        const authHeader = c.req.header('authorization');
        const token = extractBearerToken(authHeader);

        if (!token) {
            return null;
        }

        const authService = new AuthService({
            SUPABASE_URL: c.env.SUPABASE_URL,
            SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
            SUPABASE_SERVICE_ROLE_KEY: c.env.SUPABASE_SERVICE_ROLE_KEY,
            JWT_SECRET: c.env.JWT_SECRET,
        });

        const payload = await authService.verifyToken(token);
        return payload;
    } catch (error) {
        return null;
    }
}
