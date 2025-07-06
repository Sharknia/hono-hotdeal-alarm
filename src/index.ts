import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { initializeConfig } from './config';
import { createAuthRoutes } from './view/authView';
import { createKeywordRoutes } from './view/keywordView';

// CloudflareBindings 인터페이스 확장
interface ExtendedCloudflareBindings extends CloudflareBindings {
    SUPABASE_URL: { get(): Promise<string> };
    SUPABASE_ANON_KEY: { get(): Promise<string> };
    SUPABASE_SERVICE_ROLE_KEY: { get(): Promise<string> };
    JWT_SECRET: { get(): Promise<string> };
}

const app = new Hono<{ Bindings: ExtendedCloudflareBindings }>();

// CORS 설정
app.use(
    '*',
    cors({
        origin: ['https://tuum.day', 'http://localhost:3000', 'http://localhost:8787'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    })
);

// 환경변수 초기화 미들웨어
app.use('*', async (c, next) => {
    try {
        await initializeConfig(c.env);
        await next();
    } catch (error) {
        console.error('환경변수 초기화 실패:', error);
        return c.json({ detail: 'Server configuration error' }, 500);
    }
});

// 기본 메시지 라우트
app.get('/', (c) => {
    return c.text('Hono HotDeal Alarm API');
});

app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 인증 라우트 연결
app.route('/', createAuthRoutes());
app.route('/', createKeywordRoutes());

export default app;
