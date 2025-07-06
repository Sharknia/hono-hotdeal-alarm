import { Hono } from 'hono';
import { adminMiddleware, authMiddleware } from '../middleware/authMiddleware';
import { JwtPayload } from '../types/auth';

// 키워드 타입
interface KeywordCreateRequest {
    title: string;
}

interface KeywordResponse {
    id: number;
    title: string;
}

// 확장된 환경 변수 타입
interface ExtendedEnv {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    JWT_SECRET: string;
}

export function createKeywordRoutes() {
    const app = new Hono<{ Bindings: ExtendedEnv; Variables: { user?: JwtPayload } }>();

    // 키워드 등록하기 (인증 필요)
    app.post('/api/hotdeal/v1/keywords', authMiddleware(), async (c) => {
        try {
            const user = c.get('user')!; // authMiddleware를 통과했으므로 반드시 존재
            const body = (await c.req.json()) as KeywordCreateRequest;

            // 요청 데이터 검증
            if (!body.title) {
                return c.json({ detail: 'Title is required' }, 422);
            }

            // TODO: 실제 키워드 생성 로직 구현
            // 현재는 예제 응답
            const keyword: KeywordResponse = {
                id: Math.floor(Math.random() * 1000),
                title: body.title,
            };

            return c.json({ message: 'Keyword registered successfully', user_id: user.userId }, 201);
        } catch (error) {
            console.error('키워드 생성 오류:', error);
            return c.json({ detail: 'Internal server error' }, 500);
        }
    });

    // 내 키워드 리스트 보기 (인증 필요)
    app.get('/api/hotdeal/v1/keywords', authMiddleware(), async (c) => {
        try {
            const user = c.get('user')!; // authMiddleware를 통과했으므로 반드시 존재

            // TODO: 실제 키워드 조회 로직 구현
            // 현재는 예제 응답
            const keywords: KeywordResponse[] = [
                { id: 1, title: '스마트폰' },
                { id: 2, title: '노트북' },
            ];

            return c.json({ keywords: keywords, user_id: user.userId }, 200);
        } catch (error) {
            console.error('키워드 조회 오류:', error);
            return c.json({ detail: 'Internal server error' }, 500);
        }
    });

    // 내 키워드 삭제하기 (인증 필요)
    app.delete('/api/hotdeal/v1/keywords/:keyword_id', authMiddleware(), async (c) => {
        try {
            const user = c.get('user')!; // authMiddleware를 통과했으므로 반드시 존재
            const keywordId = c.req.param('keyword_id');

            if (!keywordId) {
                return c.json({ detail: 'Keyword ID is required' }, 422);
            }

            // TODO: 실제 키워드 삭제 로직 구현
            // 키워드 존재 여부 확인
            // 키워드 소유자 확인
            // 키워드 삭제

            return c.json({ message: 'Keyword deleted successfully', user_id: user.userId }, 200);
        } catch (error) {
            console.error('키워드 삭제 오류:', error);
            return c.json({ detail: 'Internal server error' }, 500);
        }
    });

    // 수동으로 핫딜 검색을 실행 (관리자 권한 필요)
    app.post('/api/admin/hotdeals/trigger-search', authMiddleware(), adminMiddleware(), async (c) => {
        try {
            const user = c.get('user')!; // authMiddleware를 통과했으므로 반드시 존재

            // TODO: 실제 핫딜 검색 트리거 로직 구현
            console.log(`관리자 ${user.email}가 핫딜 검색을 수동으로 실행했습니다.`);

            return c.json({ message: 'Hot deal search triggered', admin_id: user.userId }, 200);
        } catch (error) {
            console.error('핫딜 검색 실행 오류:', error);
            return c.json({ detail: 'Internal server error' }, 500);
        }
    });

    return app;
}
