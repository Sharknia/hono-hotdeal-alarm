import { addMyKeyword, createKeyword, deleteKeyword, getKeywordByTitle, getMyKeywordCount, isKeywordUsed, isMyKeyword, selectUsersKeywords, unlinkUserKeyword } from '../repository/keywordRepository';
import { UserRepository } from '../repository/userRepository';
import { AuthEnv } from '../types/auth';
import { KeywordCreateResponse, KeywordDeleteResponse, KeywordResponse, UserKeywordsResponse } from '../types/keyword';
import { KEYWORD_LIMITS, normalizeKeyword, validateKeyword } from '../utils/keyword';

// 키워드 등록 서비스
export async function registerKeyword(env: AuthEnv, title: string, userId: string): Promise<KeywordCreateResponse> {
    // 키워드 정규화 및 유효성 검증
    const normalizedTitle = normalizeKeyword(title);

    if (!validateKeyword(normalizedTitle)) {
        throw new Error('키워드가 유효하지 않습니다. 1~100자 사이의 텍스트를 입력해주세요.');
    }

    // 이미 존재하는 키워드인지 확인
    let keyword = await getKeywordByTitle(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, normalizedTitle);

    // 존재하지 않을 경우 키워드 생성
    if (!keyword) {
        keyword = await createKeyword(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, normalizedTitle);
    }

    // 내 키워드 개수 확인
    const myKeywordCount = await getMyKeywordCount(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, userId);

    if (myKeywordCount >= KEYWORD_LIMITS.MAX_KEYWORDS_PER_USER) {
        throw new Error(`키워드는 최대 ${KEYWORD_LIMITS.MAX_KEYWORDS_PER_USER}개까지 등록할 수 있습니다.`);
    }

    // 내 키워드로 등록
    try {
        await addMyKeyword(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, userId, keyword.id);
    } catch (error) {
        if (error instanceof Error && error.message.includes('이미 등록된')) {
            throw new Error('이미 등록된 키워드입니다.');
        }
        throw error;
    }

    // TODO: 이메일 발송 기능 구현
    // 기존 FastAPI 코드에서 이메일 발송 기능이 있었지만,
    // 현재는 이메일 서비스가 구현되지 않았으므로 추후 구현 예정
    try {
        const userRepository = new UserRepository(env);
        const user = await userRepository.findById(userId);
        if (user) {
            // TODO: 이메일 발송 구현
            console.log(`키워드 등록 알림 이메일 발송 예정: ${user.email}, 키워드: ${normalizedTitle}`);
        }
    } catch (error) {
        console.error('이메일 발송 중 오류 발생:', error);
        // 이메일 발송 실패는 키워드 등록 성공에 영향을 주지 않음
    }

    return {
        id: keyword.id,
        title: keyword.title,
        message: `키워드 '${keyword.title}'이(가) 성공적으로 등록되었습니다.`,
    };
}

// 키워드 연결 해제 서비스
export async function unlinkKeyword(env: AuthEnv, keywordId: number, userId: string): Promise<KeywordDeleteResponse> {
    // 내가 해당 키워드를 가지고 있는지 확인
    const hasKeyword = await isMyKeyword(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, userId, keywordId);

    if (!hasKeyword) {
        throw new Error('등록되지 않은 키워드입니다.');
    }

    // 연결 해제
    await unlinkUserKeyword(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, userId, keywordId);

    // 연결을 끊은 후 해당 키워드를 가지고 있는 사람이 있는지 확인
    const isUsed = await isKeywordUsed(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, keywordId);

    // 사용자가 없다면 키워드 삭제
    if (!isUsed) {
        await deleteKeyword(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, keywordId);
    }

    return {
        message: '키워드가 성공적으로 삭제되었습니다.',
    };
}

// 사용자 키워드 목록 조회 서비스
export async function viewUsersKeywords(env: AuthEnv, userId: string): Promise<UserKeywordsResponse> {
    // 유저의 키워드 리스트 조회
    const keywords = await selectUsersKeywords(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, userId);

    const keywordResponses: KeywordResponse[] = keywords.map((keyword) => ({
        id: keyword.id,
        title: keyword.title,
    }));

    return {
        keywords: keywordResponses,
        count: keywordResponses.length,
    };
}

// 키워드 ID로 키워드 정보 조회 서비스
export async function getKeywordById(env: AuthEnv, keywordId: number): Promise<KeywordResponse | null> {
    // 직접 키워드 테이블에서 조회
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

    const { data, error } = await supabase.from('hotdeal_keywords').select('id, title, wdate').eq('id', keywordId).single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null; // 데이터가 없을 때
        }
        console.error('Error fetching keyword by id:', error);
        throw new Error('키워드 조회에 실패했습니다.');
    }

    return {
        id: data.id,
        title: data.title,
    };
}

// 키워드 검색 (관리자용)
export async function searchKeywords(env: AuthEnv, searchTerm: string, limit: number = 50): Promise<KeywordResponse[]> {
    // TODO: 키워드 검색 기능 구현
    // 현재는 간단하게 모든 키워드를 가져와서 필터링
    // 실제로는 Supabase에서 LIKE 검색을 구현해야 함

    console.log(`키워드 검색: ${searchTerm}, 제한: ${limit}`);

    // 임시로 빈 배열 반환
    return [];
}

// 키워드 통계 조회 (관리자용)
export async function getKeywordStats(env: AuthEnv) {
    // TODO: 키워드 통계 조회 구현
    // 전체 키워드 수, 활성 키워드 수, 사용자 수, 사용자당 평균 키워드 수 등

    return {
        total_keywords: 0,
        active_keywords: 0,
        total_users: 0,
        average_keywords_per_user: 0,
    };
}
