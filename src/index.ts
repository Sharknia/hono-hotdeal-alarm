import { Hono } from 'hono';
import { createAuthRoutes } from './view/authView';
import { createKeywordRoutes } from './view/keywordView';

// CloudflareBindings 인터페이스 확장
interface ExtendedCloudflareBindings extends CloudflareBindings {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    JWT_SECRET: string;
}

const app = new Hono<{ Bindings: ExtendedCloudflareBindings }>();

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
