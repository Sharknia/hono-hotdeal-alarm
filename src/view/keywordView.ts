import { Hono } from 'hono';
import { adminMiddleware, authMiddleware } from '../middleware/authMiddleware';
import { getKeywordById, registerKeyword, unlinkKeyword, viewUsersKeywords } from '../service/keywordService';
import { AuthEnv, JwtPayload } from '../types/auth';
import { KeywordCreateRequest, KeywordCreateResponse, UserKeywordsResponse } from '../types/keyword';

export function createKeywordRoutes() {
    const app = new Hono<{ Bindings: AuthEnv; Variables: { user?: JwtPayload } }>();

    // 키워드 등록하기 (인증 필요)
    app.post('/api/hotdeal/v1/keywords', authMiddleware(), async (c) => {
        try {
            const user = c.get('user')!; // authMiddleware를 통과했으므로 반드시 존재
            const body = (await c.req.json()) as KeywordCreateRequest;

            // 요청 데이터 검증
            if (!body.title || typeof body.title !== 'string') {
                return c.json({ detail: 'Title is required and must be a string' }, 422);
            }

            // 키워드 등록 서비스 호출
            const result: KeywordCreateResponse = await registerKeyword(body.title, user.userId);

            return c.json(result, 201);
        } catch (error) {
            console.error('키워드 등록 오류:', error);

            if (error instanceof Error) {
                // 비즈니스 로직 오류 처리
                if (error.message.includes('키워드가 유효하지 않습니다')) {
                    return c.json({ detail: error.message }, 422);
                }
                if (error.message.includes('최대') || error.message.includes('이미 등록된')) {
                    return c.json({ detail: error.message }, 409);
                }
            }

            return c.json({ detail: 'Internal server error' }, 500);
        }
    });

    // 내 키워드 리스트 보기 (인증 필요)
    app.get('/api/hotdeal/v1/keywords', authMiddleware(), async (c) => {
        try {
            const user = c.get('user')!; // authMiddleware를 통과했으므로 반드시 존재
            // 사용자 키워드 목록 조회 서비스 호출
            const result: UserKeywordsResponse = await viewUsersKeywords(user.userId);

            return c.json(result, 200);
        } catch (error) {
            console.error('키워드 조회 오류:', error);
            return c.json({ detail: 'Internal server error' }, 500);
        }
    });

    // 내 키워드 삭제하기 (인증 필요)
    app.delete('/api/hotdeal/v1/keywords/:keyword_id', authMiddleware(), async (c) => {
        try {
            const user = c.get('user')!; // authMiddleware를 통과했으므로 반드시 존재
            const keywordIdParam = c.req.param('keyword_id');

            if (!keywordIdParam) {
                return c.json({ detail: 'Keyword ID is required' }, 422);
            }

            const keywordId = parseInt(keywordIdParam, 10);
            if (isNaN(keywordId)) {
                return c.json({ detail: 'Invalid keyword ID' }, 422);
            }

            // 키워드 연결 해제 서비스 호출
            await unlinkKeyword(keywordId, user.userId);

            return c.body(null, 204);
        } catch (error) {
            console.error('키워드 삭제 오류:', error);

            if (error instanceof Error) {
                // 비즈니스 로직 오류 처리
                if (error.message.includes('등록되지 않은 키워드')) {
                    return c.json({ detail: error.message }, 404);
                }
            }

            return c.json({ detail: 'Internal server error' }, 500);
        }
    });

    // 키워드 정보 조회 (인증 필요)
    app.get('/api/hotdeal/v1/keywords/:keyword_id', authMiddleware(), async (c) => {
        try {
            const user = c.get('user')!; // authMiddleware를 통과했으므로 반드시 존재
            const keywordIdParam = c.req.param('keyword_id');

            if (!keywordIdParam) {
                return c.json({ detail: 'Keyword ID is required' }, 422);
            }

            const keywordId = parseInt(keywordIdParam, 10);
            if (isNaN(keywordId)) {
                return c.json({ detail: 'Invalid keyword ID' }, 422);
            }

            // 키워드 정보 조회 서비스 호출
            const result = await getKeywordById(keywordId);

            if (!result) {
                return c.json({ detail: 'Keyword not found' }, 404);
            }

            return c.json(result, 200);
        } catch (error) {
            console.error('키워드 정보 조회 오류:', error);
            return c.json({ detail: 'Internal server error' }, 500);
        }
    });

    // 수동으로 핫딜 검색을 실행 (관리자 권한 필요)
    app.post('/api/admin/hotdeals/trigger-search', authMiddleware(), adminMiddleware(), async (c) => {
        try {
            const user = c.get('user')!; // authMiddleware를 통과했으므로 반드시 존재

            // TODO: 실제 핫딜 검색 트리거 로직 구현
            // 현재는 로그만 남기고 성공 응답 반환
            console.log(`관리자 ${user.email}가 핫딜 검색을 수동으로 실행했습니다.`);

            return c.json(
                {
                    message: 'Hot deal search triggered successfully',
                    admin_id: user.userId,
                    triggered_at: new Date().toISOString(),
                },
                200
            );
        } catch (error) {
            console.error('핫딜 검색 실행 오류:', error);
            return c.json({ detail: 'Internal server error' }, 500);
        }
    });

    // 키워드 통계 조회 (관리자 권한 필요)
    app.get('/api/admin/hotdeals/keywords/stats', authMiddleware(), adminMiddleware(), async (c) => {
        try {
            const user = c.get('user')!; // authMiddleware를 통과했으므로 반드시 존재

            // TODO: 키워드 통계 조회 서비스 호출
            console.log(`관리자 ${user.email}가 키워드 통계를 조회했습니다.`);

            return c.json(
                {
                    total_keywords: 0,
                    active_keywords: 0,
                    total_users: 0,
                    average_keywords_per_user: 0,
                    last_updated: new Date().toISOString(),
                },
                200
            );
        } catch (error) {
            console.error('키워드 통계 조회 오류:', error);
            return c.json({ detail: 'Internal server error' }, 500);
        }
    });

    return app;
}
