import { getConfig } from '../config';
import { addMyKeyword, createKeyword, deleteKeyword, getKeywordByTitle, getMyKeywordCount, isKeywordUsed, isMyKeyword, selectUsersKeywords, unlinkUserKeyword } from '../repository/keywordRepository';
import { UserRepository } from '../repository/userRepository';
import { KeywordCreateResponse, KeywordDeleteResponse, KeywordResponse, UserKeywordsResponse } from '../types/keyword';
import { KEYWORD_LIMITS, normalizeKeyword, validateKeyword } from '../utils/keyword';

// 키워드 등록 서비스
export async function registerKeyword(title: string, userId: string): Promise<KeywordCreateResponse> {
    // 환경변수 가져오기
    const config = getConfig();
    const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = config;

    // 키워드 정규화 및 유효성 검증
    const normalizedTitle = normalizeKeyword(title);

    if (!validateKeyword(normalizedTitle)) {
        throw new Error('키워드가 유효하지 않습니다. 1~100자 사이의 텍스트를 입력해주세요.');
    }

    // 이미 존재하는 키워드인지 확인
    let keyword = await getKeywordByTitle(supabaseUrl, supabaseAnonKey, normalizedTitle);

    // 존재하지 않을 경우 키워드 생성
    if (!keyword) {
        keyword = await createKeyword(supabaseUrl, supabaseServiceRoleKey, normalizedTitle);
    }

    // 내 키워드 개수 확인
    const myKeywordCount = await getMyKeywordCount(supabaseUrl, supabaseAnonKey, userId);

    if (myKeywordCount >= KEYWORD_LIMITS.MAX_KEYWORDS_PER_USER) {
        throw new Error(`키워드는 최대 ${KEYWORD_LIMITS.MAX_KEYWORDS_PER_USER}개까지 등록할 수 있습니다.`);
    }

    // 내 키워드로 등록
    try {
        await addMyKeyword(supabaseUrl, supabaseServiceRoleKey, userId, keyword.id);
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
        const userRepository = new UserRepository();
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
export async function unlinkKeyword(keywordId: number, userId: string): Promise<KeywordDeleteResponse> {
    // 환경변수 가져오기
    const config = getConfig();
    const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = config;

    // 내가 해당 키워드를 가지고 있는지 확인
    const hasKeyword = await isMyKeyword(supabaseUrl, supabaseAnonKey, userId, keywordId);

    if (!hasKeyword) {
        throw new Error('등록되지 않은 키워드입니다.');
    }

    // 연결 해제
    await unlinkUserKeyword(supabaseUrl, supabaseServiceRoleKey, userId, keywordId);

    // 연결을 끊은 후 해당 키워드를 가지고 있는 사람이 있는지 확인
    const isUsed = await isKeywordUsed(supabaseUrl, supabaseAnonKey, keywordId);

    // 사용자가 없다면 키워드 삭제
    if (!isUsed) {
        await deleteKeyword(supabaseUrl, supabaseServiceRoleKey, keywordId);
    }

    return {
        message: '키워드가 성공적으로 삭제되었습니다.',
    };
}

// 사용자 키워드 목록 조회 서비스
export async function viewUsersKeywords(userId: string): Promise<UserKeywordsResponse> {
    // 환경변수 가져오기
    const config = getConfig();
    const { supabaseUrl, supabaseAnonKey } = config;

    // 유저의 키워드 리스트 조회
    const keywords = await selectUsersKeywords(supabaseUrl, supabaseAnonKey, userId);

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
export async function getKeywordById(keywordId: number): Promise<KeywordResponse | null> {
    // 환경변수 가져오기
    const config = getConfig();
    const { supabaseUrl, supabaseAnonKey } = config;

    // 직접 키워드 테이블에서 조회
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
