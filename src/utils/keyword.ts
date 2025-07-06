// 키워드 정규화 함수
export function normalizeKeyword(title: string): string {
    return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

// 키워드 유효성 검증 함수
export function validateKeyword(title: string): boolean {
    const normalized = normalizeKeyword(title);
    return normalized.length > 0 && normalized.length <= 100;
}

// 키워드 검색 문자열 생성 함수
export function createSearchString(title: string): string {
    const normalized = normalizeKeyword(title);
    return `%${normalized}%`;
}

// 키워드 중복 확인용 해시 생성 함수
export function generateKeywordHash(title: string): string {
    const normalized = normalizeKeyword(title);
    return Buffer.from(normalized, 'utf8').toString('base64');
}

// 키워드 메타데이터 생성 함수
export function createKeywordMetadata(title: string, userId: string): any {
    return {
        original_title: title,
        normalized_title: normalizeKeyword(title),
        created_by: userId,
        created_at: new Date().toISOString(),
        version: '1.0',
    };
}

// 키워드 제한 상수
export const KEYWORD_LIMITS = {
    MAX_KEYWORDS_PER_USER: 10,
    MIN_KEYWORD_LENGTH: 1,
    MAX_KEYWORD_LENGTH: 100,
    MAX_DAILY_REGISTRATIONS: 50,
} as const;
