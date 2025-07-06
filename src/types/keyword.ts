// 키워드 사이트 이름 enum
export enum SiteName {
    ALGUMON = 'ALGUMON',
}

// 키워드 모델 타입
export interface Keyword {
    id: number;
    title: string;
    wdate: string;
}

// 키워드 사이트 모델 타입
export interface KeywordSite {
    keyword_id: number;
    site_name: SiteName;
    external_id: string;
    link?: string;
    price?: string;
    meta_data?: string;
    wdate: string;
}

// 키워드 등록 요청 타입
export interface KeywordCreateRequest {
    title: string;
}

// 키워드 응답 타입
export interface KeywordResponse {
    id: number;
    title: string;
}

// 키워드 등록 응답 타입
export interface KeywordCreateResponse {
    id: number;
    title: string;
    message: string;
}

// 키워드 삭제 응답 타입
export interface KeywordDeleteResponse {
    message: string;
}

// 사용자-키워드 연결 테이블 타입
export interface UserKeyword {
    user_id: string;
    keyword_id: number;
    created_at: string;
}

// 키워드 검색 트리거 요청 타입 (관리자용)
export interface KeywordSearchTriggerRequest {
    keyword_id: number;
    site_name?: SiteName;
}

// 키워드 통계 타입
export interface KeywordStats {
    total_keywords: number;
    active_keywords: number;
    total_users: number;
    average_keywords_per_user: number;
}
